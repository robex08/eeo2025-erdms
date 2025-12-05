```python
"""
TODO Alarm Notifications - Background Worker Example
=====================================================

Tento soubor obsahuje vzorovou implementaci background workeru
pro automatické vytváření notifikací z TODO alarmů.

DŮLEŽITÉ: Toto je pouze PŘÍKLAD! Přizpůsobte ho vaší architektuře.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

# ===================================================================
# KONFIGURACE
# ===================================================================

ALARM_CHECK_INTERVAL_MINUTES = 5  # Jak často worker běží
NORMAL_PRIORITY_THRESHOLD_MINUTES = 30  # 30 min před = normal
HIGH_PRIORITY_THRESHOLD_MINUTES = 10    # 10 min před = high

# Notifikační šablony
TEMPLATE_NORMAL = 'alarm_todo_normal'
TEMPLATE_HIGH = 'alarm_todo_high'
TEMPLATE_EXPIRED = 'alarm_todo_expired'

# ===================================================================
# LOGGER
# ===================================================================

logger = logging.getLogger(__name__)


# ===================================================================
# DATA MODEL (příklad, přizpůsobte svému ORM)
# ===================================================================

class TodoAlarm:
    """Model TODO alarmu"""
    def __init__(self, data: Dict):
        self.id = data['id']
        self.todo_id = data['todo_id']
        self.alarm_datetime = data['alarm_datetime']
        self.is_completed = data['is_completed']
        self.notification_sent = data.get('notification_sent', False)
        self.todo_title = data.get('todo_title', '')
        self.todo_note = data.get('todo_note', '')
        self.user_id = data.get('user_id')
        self.order_id = data.get('order_id')


# ===================================================================
# HLAVNÍ FUNKCE
# ===================================================================

def process_todo_alarms() -> int:
    """
    Zpracuje všechny čekající TODO alarmy a vytvoří notifikace.
    
    Returns:
        Počet zpracovaných alarmů
    """
    logger.info("Starting TODO alarm processing...")
    
    # 1. Načti alarmy k zpracování
    pending_alarms = get_pending_alarms()
    logger.info(f"Found {len(pending_alarms)} alarms to process")
    
    processed_count = 0
    
    # 2. Zpracuj každý alarm
    for alarm in pending_alarms:
        try:
            if process_single_alarm(alarm):
                processed_count += 1
        except Exception as e:
            logger.error(f"Error processing alarm {alarm.id}: {e}")
            continue
    
    logger.info(f"Processed {processed_count} alarms successfully")
    return processed_count


def get_pending_alarms() -> List[TodoAlarm]:
    """
    Načte TODO alarmy, které čekají na zpracování.
    
    Returns:
        Seznam TodoAlarm objektů
    """
    # PŘÍKLAD SQL - přizpůsobte svému DB přístupu
    sql = """
        SELECT 
            ta.id,
            ta.todo_id,
            ta.alarm_datetime,
            ta.is_completed,
            ta.notification_sent,
            t.title as todo_title,
            t.note as todo_note,
            t.user_id,
            t.order_id
        FROM todo_alarm ta
        JOIN todo t ON ta.todo_id = t.id
        WHERE ta.alarm_datetime <= %s
          AND ta.notification_sent = FALSE
          AND ta.is_completed = FALSE
          AND t.is_active = TRUE
        ORDER BY ta.alarm_datetime ASC
    """
    
    # Kontrola alarmů do 30 minut dopředu
    check_until = datetime.now() + timedelta(minutes=NORMAL_PRIORITY_THRESHOLD_MINUTES)
    
    # TODO: Nahraďte svým DB přístupem
    # results = db.execute(sql, [check_until])
    # return [TodoAlarm(row) for row in results]
    
    # Pro příklad:
    return []


def process_single_alarm(alarm: TodoAlarm) -> bool:
    """
    Zpracuje jeden TODO alarm - vytvoří notifikaci a označí jako zpracované.
    
    Args:
        alarm: TodoAlarm objekt k zpracování
        
    Returns:
        True pokud úspěšné, False jinak
    """
    logger.info(f"Processing alarm {alarm.id} for TODO {alarm.todo_id}")
    
    # 1. Urči typ notifikace podle času
    template_type, priority = determine_notification_type(alarm)
    
    # 2. Připrav placeholdery
    placeholders = prepare_placeholders(alarm)
    
    # 3. Vytvoř notifikaci
    notification_id = create_notification(
        user_id=alarm.user_id,
        template_type=template_type,
        priority=priority,
        placeholders=placeholders,
        related_entity='todo',
        related_id=alarm.todo_id,
        order_id=alarm.order_id
    )
    
    if not notification_id:
        logger.error(f"Failed to create notification for alarm {alarm.id}")
        return False
    
    # 4. Označ alarm jako zpracovaný
    mark_alarm_as_sent(alarm.id, notification_id)
    
    logger.info(f"Successfully processed alarm {alarm.id}, created notification {notification_id}")
    return True


def determine_notification_type(alarm: TodoAlarm) -> tuple[str, str]:
    """
    Určí typ notifikační šablony na základě času do alarmu.
    
    Args:
        alarm: TodoAlarm objekt
        
    Returns:
        Tuple (template_type, priority)
    """
    now = datetime.now()
    time_diff = (alarm.alarm_datetime - now).total_seconds() / 60  # v minutách
    
    if time_diff < 0:
        # Alarm už prošel
        return TEMPLATE_EXPIRED, 'high'
    elif time_diff < HIGH_PRIORITY_THRESHOLD_MINUTES:
        # Méně než 10 minut
        return TEMPLATE_HIGH, 'high'
    else:
        # 10-30 minut
        return TEMPLATE_NORMAL, 'normal'


def prepare_placeholders(alarm: TodoAlarm) -> Dict[str, str]:
    """
    Připraví placeholdery pro notifikační šablonu.
    
    Args:
        alarm: TodoAlarm objekt
        
    Returns:
        Dictionary s placeholdery
    """
    return {
        'todo_title': alarm.todo_title or 'Bez názvu',
        'alarm_datetime': alarm.alarm_datetime.strftime('%d. %m. %Y %H:%M'),
        'alarm_date': alarm.alarm_datetime.strftime('%d. %m. %Y'),
        'alarm_time': alarm.alarm_datetime.strftime('%H:%M'),
        'todo_note': alarm.todo_note or 'Bez poznámky',
        'todo_id': str(alarm.todo_id),
    }


def create_notification(
    user_id: int,
    template_type: str,
    priority: str,
    placeholders: Dict[str, str],
    related_entity: str = None,
    related_id: int = None,
    order_id: int = None
) -> Optional[int]:
    """
    Vytvoří notifikaci v databázi.
    
    Args:
        user_id: ID uživatele
        template_type: Typ šablony (alarm_todo_normal/high/expired)
        priority: Priorita (normal/high)
        placeholders: Placeholdery pro šablonu
        related_entity: Související entita (todo)
        related_id: ID související entity
        order_id: ID objednávky (volitelné)
        
    Returns:
        ID vytvořené notifikace, nebo None pokud se nezdařilo
    """
    # PŘÍKLAD SQL - přizpůsobte svému DB přístupu
    
    # 1. Načti šablonu
    # template = get_notification_template(template_type)
    
    # 2. Nahraď placeholdery v app_title a app_message
    # app_title = replace_placeholders(template.app_title, placeholders)
    # app_message = replace_placeholders(template.app_message, placeholders)
    
    # 3. Vytvoř notifikaci
    sql = """
        INSERT INTO notification (
            user_id,
            template_type,
            priority,
            app_title,
            app_message,
            is_read,
            is_sent,
            related_entity,
            related_id,
            order_id,
            dt_created
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    # TODO: Nahraďte svým DB přístupem
    # notification_id = db.execute(sql, [...])
    # return notification_id
    
    # Pro příklad:
    logger.info(f"Would create notification: user={user_id}, type={template_type}, priority={priority}")
    return 999  # Fake ID


def mark_alarm_as_sent(alarm_id: int, notification_id: int) -> bool:
    """
    Označí alarm jako zpracovaný.
    
    Args:
        alarm_id: ID alarmu
        notification_id: ID vytvořené notifikace
        
    Returns:
        True pokud úspěšné
    """
    sql = """
        UPDATE todo_alarm
        SET notification_sent = TRUE,
            notification_sent_at = %s,
            last_notification_id = %s
        WHERE id = %s
    """
    
    # TODO: Nahraďte svým DB přístupem
    # db.execute(sql, [datetime.now(), notification_id, alarm_id])
    
    logger.info(f"Marked alarm {alarm_id} as sent (notification {notification_id})")
    return True


# ===================================================================
# MONITORING & STATISTIKY
# ===================================================================

def get_pending_alarms_count() -> int:
    """Vrátí počet alarmů čekajících na zpracování"""
    sql = """
        SELECT COUNT(*) as count
        FROM todo_alarm ta
        JOIN todo t ON ta.todo_id = t.id
        WHERE ta.alarm_datetime <= %s
          AND ta.notification_sent = FALSE
          AND ta.is_completed = FALSE
          AND t.is_active = TRUE
    """
    # TODO: Implementovat
    return 0


def get_average_notification_delay() -> float:
    """Vrátí průměrné zpoždění notifikací v minutách"""
    sql = """
        SELECT AVG(TIMESTAMPDIFF(MINUTE, alarm_datetime, notification_sent_at)) as avg_delay
        FROM todo_alarm
        WHERE notification_sent = TRUE
          AND notification_sent_at IS NOT NULL
    """
    # TODO: Implementovat
    return 0.0


# ===================================================================
# MAIN ENTRY POINT
# ===================================================================

def main():
    """Hlavní vstupní bod pro background worker"""
    try:
        logger.info("=" * 60)
        logger.info("TODO Alarm Notification Worker - Starting")
        logger.info("=" * 60)
        
        # Zpracuj alarmy
        processed = process_todo_alarms()
        
        # Statistiky
        pending = get_pending_alarms_count()
        logger.info(f"Statistics: processed={processed}, pending={pending}")
        
        logger.info("=" * 60)
        logger.info("TODO Alarm Notification Worker - Finished")
        logger.info("=" * 60)
        
        return 0
    
    except Exception as e:
        logger.error(f"Fatal error in TODO alarm worker: {e}")
        return 1


if __name__ == '__main__':
    # Nastavení loggingu
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    exit(main())


# ===================================================================
# CRON JOB SETUP (příklad)
# ===================================================================
"""
# Přidej do crontabu:
*/5 * * * * /usr/bin/python3 /path/to/todo_alarm_worker.py >> /var/log/todo_alarms.log 2>&1

# Nebo použij systemd timer:
# /etc/systemd/system/todo-alarm-worker.service
# /etc/systemd/system/todo-alarm-worker.timer
"""
```
