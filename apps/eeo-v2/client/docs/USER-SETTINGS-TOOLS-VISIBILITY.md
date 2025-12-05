# Viditelnost ikon nástrojů - Uživatelské nastavení

## Přehled

Uživatelé mohou nastavit, které ikony nástrojů se budou zobrazovat v aplikaci. Toto nastavení zahrnuje:
- 📝 **Poznámky (Notes)**
- ✅ **TODO seznam**
- 💬 **Chat**
- 🧮 **Kalkulačka**

## Nastavení v ProfilePage

Uživatel může v sekci **Nastavení > Chování a předvolby aplikace** zapnout/vypnout zobrazení jednotlivých ikon pomocí toggle switchů.

### Struktura v userSettings

```javascript
zobrazit_ikony_nastroju: {
  notes: true,       // Poznámky
  todo: true,        // TODO seznam
  chat: true,        // Chat
  kalkulacka: true   // Kalkulačka
}
```

## Použití v komponentách

### Import helper funkcí

```javascript
import { 
  getToolsVisibility, 
  isToolVisible, 
  getVisibleTools,
  hasVisibleTools 
} from '../utils/toolsVisibility';
```

### Příklad 1: Zobrazení všech ikon nástrojů

```javascript
const ToolsBar = () => {
  const toolsVisibility = getToolsVisibility();
  
  return (
    <div className="tools-bar">
      {toolsVisibility.notes && (
        <button className="tool-icon" title="Poznámky">
          📝
        </button>
      )}
      
      {toolsVisibility.todo && (
        <button className="tool-icon" title="TODO">
          ✅
        </button>
      )}
      
      {toolsVisibility.chat && (
        <button className="tool-icon" title="Chat">
          💬
        </button>
      )}
      
      {toolsVisibility.kalkulacka && (
        <button className="tool-icon" title="Kalkulačka">
          🧮
        </button>
      )}
    </div>
  );
};
```

### Příklad 2: Kontrola viditelnosti jednotlivého nástroje

```javascript
const NotesButton = () => {
  if (!isToolVisible('notes')) {
    return null; // Nezobrazovat, pokud je vypnuto
  }
  
  return (
    <button onClick={() => openNotes()}>
      📝 Poznámky
    </button>
  );
};
```

### Příklad 3: Dynamické načítání pouze viditelných nástrojů

```javascript
const DynamicToolsMenu = () => {
  const visibleTools = getVisibleTools();
  
  const toolsConfig = {
    notes: { icon: '📝', label: 'Poznámky', action: openNotes },
    todo: { icon: '✅', label: 'TODO', action: openTodo },
    chat: { icon: '💬', label: 'Chat', action: openChat },
    kalkulacka: { icon: '🧮', label: 'Kalkulačka', action: openCalculator }
  };
  
  return (
    <div className="tools-menu">
      {visibleTools.map(toolName => {
        const tool = toolsConfig[toolName];
        return (
          <button 
            key={toolName}
            onClick={tool.action}
          >
            {tool.icon} {tool.label}
          </button>
        );
      })}
    </div>
  );
};
```

### Příklad 4: Podmíněné zobrazení celé sekce nástrojů

```javascript
const AppLayout = () => {
  if (!hasVisibleTools()) {
    return <MainContent />; // Nezobrazovat toolbar, pokud nejsou žádné nástroje
  }
  
  return (
    <>
      <ToolsBar />
      <MainContent />
    </>
  );
};
```

## React Hook pro automatické načítání

Můžete vytvořit custom hook pro snadné použití:

```javascript
// hooks/useToolsVisibility.js
import { useState, useEffect } from 'react';
import { getToolsVisibility } from '../utils/toolsVisibility';

export const useToolsVisibility = () => {
  const [toolsVisibility, setToolsVisibility] = useState(getToolsVisibility());
  
  useEffect(() => {
    // Aktualizovat při změně localStorage (po uložení nastavení)
    const handleStorageChange = () => {
      setToolsVisibility(getToolsVisibility());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  return toolsVisibility;
};
```

Použití:

```javascript
const ToolsMenu = () => {
  const toolsVisibility = useToolsVisibility();
  
  return (
    <div>
      {toolsVisibility.notes && <NotesButton />}
      {toolsVisibility.todo && <TodoButton />}
      {toolsVisibility.chat && <ChatButton />}
      {toolsVisibility.kalkulacka && <CalculatorButton />}
    </div>
  );
};
```

## Backend

Nastavení se ukládá do tabulky `user_nastaveni` ve sloupci `nastaveni` jako JSON:

```sql
{
  "zobrazit_ikony_nastroju": {
    "notes": true,
    "todo": true,
    "chat": false,
    "kalkulacka": true
  },
  ...
}
```

## Výchozí hodnoty

Pokud uživatel nemá nastavení uložené, všechny ikony jsou **viditelné** (true).

## Testování

1. Přihlaste se do aplikace
2. Otevřete **Profil > Nastavení**
3. Rozbalte sekci **"Chování a předvolby aplikace"**
4. Vypněte některý nástroj (např. Chat)
5. Klikněte na **"Uložit a aplikovat nastavení"**
6. Po reloadu by ikona Chatu neměla být viditelná

## Datum vytvoření
19. listopadu 2025
