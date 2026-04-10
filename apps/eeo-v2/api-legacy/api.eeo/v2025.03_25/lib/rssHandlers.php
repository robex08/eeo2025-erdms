<?php

/**
 * API Handlers pro RSS feed proxy
 * Pattern: POST /rss-feed s token a username v body
 * 
 * Načítá RSS feed ze zadané URL a vrací zpracovaná data jako JSON.
 * URL RSS feedu se čte z globálního nastavení (tabulka 25a_nastaveni_globalni).
 * 
 * @package EEO API v2025.03_25
 */

require_once __DIR__ . '/TimezoneHelper.php';

/**
 * POST /rss-feed
 * Načte RSS feed ze zadané URL (z DB nastavení) a vrátí zpracované články
 * 
 * Body: { token, username, max_items?: number }
 */
function handle_rss_feed($input, $db) {
    // Autentizace
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token, $db);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    try {
        TimezoneHelper::setMysqlTimezone($db);
        
        // Načíst nastavení RSS z DB
        $stmt = $db->prepare("SELECT klic, hodnota FROM " . TBL_NASTAVENI_GLOBALNI . " WHERE klic LIKE 'rss_%'");
        $stmt->execute();
        
        $rssSettings = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $rssSettings[$row['klic']] = $row['hodnota'];
        }
        
        // Kontrola zda je RSS povoleno
        $rssEnabled = ($rssSettings['rss_enabled'] ?? '0') === '1';
        if (!$rssEnabled) {
            http_response_code(200);
            echo json_encode(array(
                'status' => 'success',
                'data' => array(),
                'message' => 'RSS feed je vypnutý',
                'rss_enabled' => false
            ));
            return;
        }
        
        // Načíst RSS feeds konfiguraci (JSON)
        $feedsJson = $rssSettings['rss_feeds'] ?? '[]';
        $feeds = json_decode($feedsJson, true);
        if (!is_array($feeds) || empty($feeds)) {
            http_response_code(200);
            echo json_encode(array(
                'status' => 'success',
                'data' => array(),
                'message' => 'Žádné RSS feedy nejsou nakonfigurovány',
                'rss_enabled' => true
            ));
            return;
        }
        
        $allItems = array();
        $feedStatuses = array();
        
        // Celkový max z DB nastavení (kolik zobrazit na FE)
        $maxTotal = isset($input['max_items']) ? (int)$input['max_items'] : 10;
        $dbMaxItems = (int)($rssSettings['rss_max_items'] ?? $maxTotal);
        $maxTotal = max(1, min(50, $dbMaxItems));
        
        // Každý feed vrátí maxTotal položek — FE filtruje a limituje
        $perFeedMax = $maxTotal;
        
        foreach ($feeds as $feed) {
            if (!isset($feed['url']) || empty($feed['url'])) {
                continue;
            }
            
            $feedUrl = $feed['url'];
            $feedName = $feed['name'] ?? 'RSS Feed';
            $feedEnabled = $feed['enabled'] ?? true;
            
            if (!$feedEnabled) {
                $feedStatuses[] = array('name' => $feedName, 'url' => $feedUrl, 'status' => 'disabled', 'count' => 0);
                continue;
            }
            
            // Validace URL
            if (!filter_var($feedUrl, FILTER_VALIDATE_URL)) {
                error_log("RSS: Neplatná URL feedu: " . $feedUrl);
                $feedStatuses[] = array('name' => $feedName, 'url' => $feedUrl, 'status' => 'error', 'error' => 'Neplatná URL', 'count' => 0);
                continue;
            }
            
            // Pouze HTTP/HTTPS protokol
            $parsedUrl = parse_url($feedUrl);
            if (!in_array(($parsedUrl['scheme'] ?? ''), array('http', 'https'))) {
                error_log("RSS: Nepodporovaný protokol v URL: " . $feedUrl);
                $feedStatuses[] = array('name' => $feedName, 'url' => $feedUrl, 'status' => 'error', 'error' => 'Nepodporovaný protokol', 'count' => 0);
                continue;
            }
            
            // Načíst RSS feed (s auto-discovery)
            $feedResult = fetch_rss_feed($feedUrl, $feedName, $perFeedMax);
            $allItems = array_merge($allItems, $feedResult['items']);
            $feedStatuses[] = array(
                'name' => $feedName,
                'url' => $feedUrl,
                'resolved_url' => $feedResult['resolved_url'],
                'status' => $feedResult['status'],
                'error' => $feedResult['error_message'] ?: null,
                'count' => count($feedResult['items'])
            );
        }
        
        // Seřadit podle data (nejnovější první)
        usort($allItems, function($a, $b) {
            return strtotime($b['pub_date_raw'] ?? '0') - strtotime($a['pub_date_raw'] ?? '0');
        });
        
        $refreshInterval = (int)($rssSettings['rss_refresh_interval'] ?? 15);
        
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $allItems,
            'count' => count($allItems),
            'max_items' => $maxTotal,
            'rss_enabled' => true,
            'refresh_interval' => $refreshInterval,
            'feed_statuses' => $feedStatuses,
            'message' => 'RSS data načtena úspěšně'
        ), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        
    } catch (Exception $e) {
        error_log("RSS Handler error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání RSS feedu: ' . $e->getMessage()
        ));
    }
}

/**
 * Načte a zpracuje RSS feed z dané URL.
 * Pokud URL vrátí HTML místo XML, pokusí se auto-discovernout RSS odkaz z HTML hlavičky.
 * 
 * @param string $url URL RSS feedu nebo stránky s RSS odkazem
 * @param string $feedName Název feedu
 * @param int $maxItems Maximální počet položek
 * @return array ['items' => [...], 'status' => 'ok'|'error', 'resolved_url' => '...', 'error_message' => '...']
 */
function fetch_rss_feed($url, $feedName, $maxItems = 10) {
    $result = array('items' => array(), 'status' => 'ok', 'resolved_url' => $url, 'error_message' => '');

    $context = stream_context_create(array(
        'http' => array(
            'timeout' => 10,
            'user_agent' => 'ERDMS RSS Reader/1.0',
            'follow_location' => true,
            'max_redirects' => 3
        ),
        'ssl' => array(
            'verify_peer' => true,
            'verify_peer_name' => true
        )
    ));
    
    $content = @file_get_contents($url, false, $context);
    
    if ($content === false) {
        error_log("RSS: Nepodařilo se načíst URL: " . $url);
        $result['status'] = 'error';
        $result['error_message'] = 'Nepodařilo se načíst URL';
        return $result;
    }
    

    
    // Zkusit parsovat jako XML (RSS/Atom)
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($content, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
    
    if ($xml === false) {
        // XML parsování selhalo — zkusit auto-discovery z HTML
        libxml_clear_errors();
        $rssUrl = discover_rss_url($content, $url);
        
        if ($rssUrl) {
            error_log("RSS: Auto-discovered RSS URL: " . $rssUrl . " z " . $url);
            $result['resolved_url'] = $rssUrl;
            
            $xmlContent = @file_get_contents($rssUrl, false, $context);
            if ($xmlContent === false) {
                error_log("RSS: Nepodařilo se načíst discovered URL: " . $rssUrl);
                $result['status'] = 'error';
                $result['error_message'] = 'Nepodařilo se načíst nalezený RSS feed';
                return $result;
            }
            
            $xml = simplexml_load_string($xmlContent, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
            if ($xml === false) {
                libxml_clear_errors();
                error_log("RSS: Discovered URL není platný XML: " . $rssUrl);
                $result['status'] = 'error';
                $result['error_message'] = 'Nalezený RSS odkaz neobsahuje platný XML';
                return $result;
            }
        } else {
            error_log("RSS: URL není XML ani HTML s RSS odkazem: " . $url);
            $result['status'] = 'error';
            $result['error_message'] = 'URL neobsahuje RSS feed ani odkaz na něj';
            return $result;
        }
    }
    
    // Parsování RSS/Atom položek
    $result['items'] = parse_feed_items($xml, $feedName, $maxItems);
    return $result;
}

/**
 * Auto-discovery RSS feedu z HTML stránky.
 * Hledá <link rel="alternate" type="application/rss+xml" href="..."> v HTML.
 * 
 * @param string $html HTML obsah stránky
 * @param string $baseUrl Základní URL pro převod relativních odkazů
 * @return string|null Nalezená RSS URL nebo null
 */
function discover_rss_url($html, $baseUrl) {
    // Hledat <link> s RSS typem v hlavičce
    $patterns = array(
        '/<link[^>]+type=["\']application\/rss\+xml["\'][^>]+href=["\']([^"\']+)["\']/i',
        '/<link[^>]+href=["\']([^"\']+)["\'][^>]+type=["\']application\/rss\+xml["\']/i',
        '/<link[^>]+type=["\']application\/atom\+xml["\'][^>]+href=["\']([^"\']+)["\']/i',
        '/<link[^>]+href=["\']([^"\']+)["\'][^>]+type=["\']application\/atom\+xml["\']/i',
    );
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $rssHref = $matches[1];
            
            // Převod relativní URL na absolutní
            if (strpos($rssHref, 'http') !== 0) {
                $parsed = parse_url($baseUrl);
                $base = $parsed['scheme'] . '://' . $parsed['host'];
                if (strpos($rssHref, '/') === 0) {
                    $rssHref = $base . $rssHref;
                } else {
                    $rssHref = $base . '/' . $rssHref;
                }
            }
            
            // Validace
            if (filter_var($rssHref, FILTER_VALIDATE_URL)) {
                return $rssHref;
            }
        }
    }
    
    // Fallback: zkusit běžné RSS cesty
    $parsed = parse_url($baseUrl);
    $base = $parsed['scheme'] . '://' . $parsed['host'];
    $commonPaths = array('/rss', '/rss.xml', '/feed', '/feed.xml', '/atom.xml');
    
    $testContext = stream_context_create(array(
        'http' => array(
            'timeout' => 5,
            'user_agent' => 'ERDMS RSS Reader/1.0',
            'method' => 'HEAD',
            'follow_location' => true,
            'max_redirects' => 3
        ),
        'ssl' => array(
            'verify_peer' => true,
            'verify_peer_name' => true
        )
    ));
    
    foreach ($commonPaths as $path) {
        $testUrl = $base . $path;
        $headers = @get_headers($testUrl, 1);
        if ($headers !== false) {
            $statusLine = is_array($headers[0]) ? $headers[0][0] : $headers[0];
            if (strpos($statusLine, '200') !== false) {
                return $testUrl;
            }
        }
    }
    
    return null;
}

/**
 * Parsuje RSS 2.0 nebo Atom feed XML do pole položek
 */
function parse_feed_items($xml, $feedName, $maxItems = 10) {
    $items = array();
    
    // Registrace media namespace (Yahoo MRSS) a szn namespace (Seznam.cz)
    $namespaces = $xml->getNamespaces(true);
    $mediaNs = $namespaces['media'] ?? 'http://search.yahoo.com/mrss/';
    $sznNs = $namespaces['szn'] ?? null;
    
    // Standardní RSS 2.0
    if (isset($xml->channel->item)) {
        $count = 0;
        foreach ($xml->channel->item as $item) {
            if ($count >= $maxItems) break;
            
            $title = trim((string)$item->title);
            $description = trim((string)$item->description);
            $link = trim((string)$item->link);
            $pubDate = trim((string)$item->pubDate);
            $category = trim((string)$item->category);
            $guid = trim((string)$item->guid);
            
            // Obrázek: 1) enclosure, 2) media:content, 3) media:thumbnail
            $imageUrl = '';
            if (isset($item->enclosure)) {
                $encType = (string)$item->enclosure['type'];
                if (strpos($encType, 'image') !== false) {
                    $imageUrl = (string)$item->enclosure['url'];
                }
            }
            
            if (empty($imageUrl)) {
                $media = $item->children($mediaNs);
                if (isset($media->content) && $media->content->count() > 0) {
                    $mcAttrs = $media->content[0]->attributes();
                    $mediaType = (string)($mcAttrs['type'] ?? '');
                    $mediaUrl = (string)($mcAttrs['url'] ?? '');
                    if (!empty($mediaUrl) && (empty($mediaType) || strpos($mediaType, 'image') !== false)) {
                        $imageUrl = $mediaUrl;
                    }
                }
                if (empty($imageUrl) && isset($media->thumbnail) && $media->thumbnail->count() > 0) {
                    $thumbAttrs = $media->thumbnail[0]->attributes();
                    $imageUrl = (string)($thumbAttrs['url'] ?? '');
                }
            }
            
            // 4) szn:image > szn:url (Seznam Zprávy)
            if (empty($imageUrl) && $sznNs) {
                $szn = $item->children($sznNs);
                if (isset($szn->image) && isset($szn->image->url)) {
                    $imageUrl = trim((string)$szn->image->url);
                }
            }
            
            $shortDescription = mb_strlen($description) > 250 
                ? mb_substr($description, 0, 250) . '...' 
                : $description;
            $shortDescription = strip_tags($shortDescription);
            
            $items[] = array(
                'title' => htmlspecialchars($title, ENT_QUOTES, 'UTF-8'),
                'description' => htmlspecialchars($shortDescription, ENT_QUOTES, 'UTF-8'),
                'link' => filter_var($link, FILTER_VALIDATE_URL) ? $link : '',
                'pub_date' => $pubDate ? date('d.m.Y H:i', strtotime($pubDate)) : '',
                'pub_date_raw' => $pubDate,
                'category' => htmlspecialchars($category, ENT_QUOTES, 'UTF-8'),
                'image_url' => filter_var($imageUrl, FILTER_VALIDATE_URL) ? $imageUrl : '',
                'feed_name' => htmlspecialchars($feedName, ENT_QUOTES, 'UTF-8'),
                'guid' => $guid
            );
            $count++;
        }
    }
    // Atom feed
    elseif (isset($xml->entry)) {
        $count = 0;
        foreach ($xml->entry as $entry) {
            if ($count >= $maxItems) break;
            
            $title = trim((string)$entry->title);
            $description = trim((string)($entry->summary ?? $entry->content ?? ''));
            $link = '';
            if (isset($entry->link)) {
                $link = (string)$entry->link['href'];
            }
            $pubDate = trim((string)($entry->published ?? $entry->updated ?? ''));
            $category = isset($entry->category) ? (string)$entry->category['term'] : '';
            
            $shortDescription = mb_strlen($description) > 250 
                ? mb_substr($description, 0, 250) . '...' 
                : $description;
            $shortDescription = strip_tags($shortDescription);
            
            $items[] = array(
                'title' => htmlspecialchars($title, ENT_QUOTES, 'UTF-8'),
                'description' => htmlspecialchars($shortDescription, ENT_QUOTES, 'UTF-8'),
                'link' => filter_var($link, FILTER_VALIDATE_URL) ? $link : '',
                'pub_date' => $pubDate ? date('d.m.Y H:i', strtotime($pubDate)) : '',
                'pub_date_raw' => $pubDate,
                'category' => htmlspecialchars($category, ENT_QUOTES, 'UTF-8'),
                'image_url' => '',
                'feed_name' => htmlspecialchars($feedName, ENT_QUOTES, 'UTF-8'),
                'guid' => (string)($entry->id ?? '')
            );
            $count++;
        }
    }
    
    return $items;
}
