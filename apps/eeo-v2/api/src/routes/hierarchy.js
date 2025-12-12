/**
 * Hierarchy Routes - API pro správu organizační hierarchie
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const db = require('../db/connection');

/**
 * GET /api/hierarchy/users
 * Načte všechny uživatele pro sidebar
 */
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.jmeno,
        u.prijmeni,
        u.email,
        u.pozice,
        l.nazev as lokalita,
        us.nazev as usek,
        u.aktivni
      FROM 25_uzivatele u
      LEFT JOIN 25_lokality l ON u.lokalita_id = l.id
      LEFT JOIN 25_useky us ON u.usek_id = us.id
      WHERE u.aktivni = 1
      ORDER BY u.prijmeni, u.jmeno
    `);

    const formattedUsers = users.map(u => {
      const initials = `${u.jmeno?.[0] || ''}${u.prijmeni?.[0] || ''}`.toUpperCase();
      return {
        id: u.id.toString(),
        name: `${u.jmeno} ${u.prijmeni}`,
        position: u.pozice || 'Neuvedeno',
        location: u.lokalita || 'Neuvedeno',
        department: u.usek || 'Neuvedeno',
        initials: initials || '?',
        email: u.email
      };
    });

    res.json({
      success: true,
      data: formattedUsers,
      count: formattedUsers.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Chyba při načítání uživatelů',
      details: error.message
    });
  }
});

/**
 * GET /api/hierarchy/locations
 * Načte všechny lokality
 */
router.get('/locations', authenticateToken, async (req, res) => {
  try {
    const [locations] = await db.query(`
      SELECT 
        l.id,
        l.nazev,
        l.adresa,
        COUNT(u.id) as userCount
      FROM 25_lokality l
      LEFT JOIN 25_uzivatele u ON u.lokalita_id = l.id AND u.aktivni = 1
      GROUP BY l.id, l.nazev, l.adresa
      ORDER BY l.nazev
    `);

    const formattedLocations = locations.map(loc => ({
      id: loc.id.toString(),
      name: loc.nazev,
      address: loc.adresa,
      userCount: loc.userCount
    }));

    res.json({
      success: true,
      data: formattedLocations,
      count: formattedLocations.length
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      error: 'Chyba při načítání lokalit',
      details: error.message
    });
  }
});

/**
 * GET /api/hierarchy/departments
 * Načte všechny úseky
 */
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const [departments] = await db.query(`
      SELECT 
        us.id,
        us.nazev,
        us.popis,
        COUNT(u.id) as userCount
      FROM 25_useky us
      LEFT JOIN 25_uzivatele u ON u.usek_id = us.id AND u.aktivni = 1
      GROUP BY us.id, us.nazev, us.popis
      ORDER BY us.nazev
    `);

    const formattedDepartments = departments.map(dept => ({
      id: dept.id.toString(),
      name: dept.nazev,
      description: dept.popis,
      userCount: dept.userCount
    }));

    res.json({
      success: true,
      data: formattedDepartments,
      count: formattedDepartments.length
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Chyba při načítání úseků',
      details: error.message
    });
  }
});

/**
 * GET /api/hierarchy/structure
 * Načte kompletní hierarchickou strukturu včetně vztahů
 */
router.get('/structure', authenticateToken, async (req, res) => {
  try {
    // Načtení uživatelů s jejich pozicemi
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.jmeno,
        u.prijmeni,
        u.pozice,
        l.nazev as lokalita,
        us.nazev as usek
      FROM 25_uzivatele u
      LEFT JOIN 25_lokality l ON u.lokalita_id = l.id
      LEFT JOIN 25_useky us ON u.usek_id = us.id
      WHERE u.aktivni = 1
    `);

    // Načtení hierarchických vztahů
    const [relationships] = await db.query(`
      SELECT 
        h.nadrizeny_id,
        h.podrizeny_id,
        h.typ_vztahu,
        h.uroven_opravneni,
        h.viditelnost_objednavky,
        h.viditelnost_faktury,
        h.viditelnost_smlouvy,
        h.viditelnost_pokladna,
        h.viditelnost_uzivatele,
        h.viditelnost_lp,
        h.notifikace_email,
        h.notifikace_inapp,
        h.notifikace_typy,
        h.rozsirene_lokality,
        h.rozsirene_useky,
        h.dt_od,
        h.dt_do,
        h.aktivni
      FROM 25_uzivatele_hierarchie h
      WHERE h.aktivni = 1
        AND (h.dt_od IS NULL OR h.dt_od <= CURDATE())
        AND (h.dt_do IS NULL OR h.dt_do >= CURDATE())
    `);

    // Formátování uživatelů pro React Flow
    const nodes = users.map(u => {
      const initials = `${u.jmeno?.[0] || ''}${u.prijmeni?.[0] || ''}`.toUpperCase();
      return {
        id: u.id.toString(),
        name: `${u.jmeno} ${u.prijmeni}`,
        position: u.pozice || 'Neuvedeno',
        initials: initials || '?',
        metadata: {
          location: u.lokalita || 'Neuvedeno',
          department: u.usek || 'Neuvedeno'
        }
      };
    });

    // Formátování vztahů pro React Flow edges
    const edges = relationships.map((rel, index) => ({
      id: `e${rel.nadrizeny_id}-${rel.podrizeny_id}`,
      source: rel.nadrizeny_id.toString(),
      target: rel.podrizeny_id.toString(),
      type: rel.typ_vztahu || 'prime',
      permissions: {
        level: rel.uroven_opravneni,
        visibility: {
          objednavky: rel.viditelnost_objednavky === 1,
          faktury: rel.viditelnost_faktury === 1,
          smlouvy: rel.viditelnost_smlouvy === 1,
          pokladna: rel.viditelnost_pokladna === 1,
          uzivatele: rel.viditelnost_uzivatele === 1,
          lp: rel.viditelnost_lp === 1
        },
        notifications: {
          email: rel.notifikace_email === 1,
          inapp: rel.notifikace_inapp === 1,
          types: rel.notifikace_typy ? JSON.parse(rel.notifikace_typy) : []
        },
        extended: {
          locations: rel.rozsirene_lokality ? JSON.parse(rel.rozsirene_lokality) : [],
          departments: rel.rozsirene_useky ? JSON.parse(rel.rozsirene_useky) : []
        }
      },
      validity: {
        from: rel.dt_od,
        to: rel.dt_do
      }
    }));

    res.json({
      success: true,
      data: {
        nodes,
        edges
      },
      counts: {
        users: nodes.length,
        relationships: edges.length
      }
    });
  } catch (error) {
    console.error('Error fetching hierarchy structure:', error);
    res.status(500).json({
      success: false,
      error: 'Chyba při načítání hierarchické struktury',
      details: error.message
    });
  }
});

/**
 * POST /api/hierarchy/save
 * Uloží kompletní hierarchickou strukturu
 * Requires: Admin role
 */
router.post('/save', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { nodes, edges } = req.body;
    const userId = req.user.id;

    // Deaktivovat všechny současné vztahy
    await connection.query(`
      UPDATE 25_uzivatele_hierarchie 
      SET aktivni = 0, 
          upravil_user_id = ?,
          dt_upraveno = NOW()
      WHERE aktivni = 1
    `, [userId]);

    // Vložit nové vztahy
    if (edges && edges.length > 0) {
      const values = edges.map(edge => [
        parseInt(edge.source),
        parseInt(edge.target),
        edge.type || 'prime',
        edge.permissions?.level || 1,
        edge.permissions?.visibility?.objednavky ? 1 : 0,
        edge.permissions?.visibility?.faktury ? 1 : 0,
        edge.permissions?.visibility?.smlouvy ? 1 : 0,
        edge.permissions?.visibility?.pokladna ? 1 : 0,
        edge.permissions?.visibility?.uzivatele ? 1 : 0,
        edge.permissions?.visibility?.lp ? 1 : 0,
        edge.permissions?.notifications?.email ? 1 : 0,
        edge.permissions?.notifications?.inapp ? 1 : 0,
        JSON.stringify(edge.permissions?.notifications?.types || []),
        JSON.stringify(edge.permissions?.extended?.locations || []),
        JSON.stringify(edge.permissions?.extended?.departments || []),
        edge.validity?.from || null,
        edge.validity?.to || null,
        1, // aktivni
        userId
      ]);

      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      
      await connection.query(`
        INSERT INTO 25_uzivatele_hierarchie (
          nadrizeny_id, podrizeny_id, typ_vztahu, uroven_opravneni,
          viditelnost_objednavky, viditelnost_faktury, viditelnost_smlouvy,
          viditelnost_pokladna, viditelnost_uzivatele, viditelnost_lp,
          notifikace_email, notifikace_inapp, notifikace_typy,
          rozsirene_lokality, rozsirene_useky,
          dt_od, dt_do, aktivni, upravil_user_id
        ) VALUES ${placeholders}
      `, values.flat());
    }

    // Uložit pozice uzlů (můžeme vytvořit další tabulku nebo použít JSON v uživatelích)
    // Pro teď přeskočíme - pozice se ukládají jen v local storage frontendu

    await connection.commit();

    res.json({
      success: true,
      message: 'Hierarchie úspěšně uložena',
      saved: {
        relationships: edges?.length || 0
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error saving hierarchy:', error);
    res.status(500).json({
      success: false,
      error: 'Chyba při ukládání hierarchie',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/hierarchy/relationship/:id
 * Smaže konkrétní vztah
 * Requires: Admin role
 */
router.delete('/relationship/:supervisorId/:subordinateId', 
  authenticateToken, 
  requireRole(['Admin']), 
  async (req, res) => {
    try {
      const { supervisorId, subordinateId } = req.params;
      const userId = req.user.id;

      const [result] = await db.query(`
        UPDATE 25_uzivatele_hierarchie 
        SET aktivni = 0,
            upravil_user_id = ?,
            dt_upraveno = NOW()
        WHERE nadrizeny_id = ? 
          AND podrizeny_id = ?
          AND aktivni = 1
      `, [userId, supervisorId, subordinateId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Vztah nenalezen'
        });
      }

      res.json({
        success: true,
        message: 'Vztah byl úspěšně odstraněn'
      });

    } catch (error) {
      console.error('Error deleting relationship:', error);
      res.status(500).json({
        success: false,
        error: 'Chyba při mazání vztahu',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/hierarchy/notification-types
 * Načte dostupné typy notifikací
 */
router.get('/notification-types', authenticateToken, async (req, res) => {
  try {
    // Statický seznam typů notifikací - v budoucnu může být v DB
    const notificationTypes = [
      { id: 'order_created', name: 'Nová objednávka', category: 'orders' },
      { id: 'order_approved', name: 'Schválená objednávka', category: 'orders' },
      { id: 'order_rejected', name: 'Zamítnutá objednávka', category: 'orders' },
      { id: 'invoice_created', name: 'Nová faktura', category: 'invoices' },
      { id: 'invoice_approved', name: 'Schválená faktura', category: 'invoices' },
      { id: 'invoice_paid', name: 'Zaplacená faktura', category: 'invoices' },
      { id: 'contract_expiring', name: 'Vypršení smlouvy', category: 'contracts' },
      { id: 'contract_created', name: 'Nová smlouva', category: 'contracts' },
      { id: 'budget_warning', name: 'Upozornění na rozpočet', category: 'finance' },
      { id: 'approval_required', name: 'Vyžaduje schválení', category: 'general' },
      { id: 'mention', name: 'Zmínka v komentáři', category: 'general' },
      { id: 'task_assigned', name: 'Přiřazený úkol', category: 'general' }
    ];

    res.json({
      success: true,
      data: notificationTypes
    });
  } catch (error) {
    console.error('Error fetching notification types:', error);
    res.status(500).json({
      success: false,
      error: 'Chyba při načítání typů notifikací',
      details: error.message
    });
  }
});

module.exports = router;
