---
agent: agent
priority: high
model: Claude Sonnet 4.5 (copilot)
name: OBECNA_pravidla
---
## KRITICKE, snazit se minimalne vyuzivat
  - useEfekty pokud to nejde jinak
  - settimeouty pokud to nejde jinak
  - vzdy radne zvazit zda neni lepsi udelat -  - - synchronni operaci, nez to resit asynchorne.

  - pokud uz asynchronne, tak vzdy s cleanupem ve useEffectu
  - pokud je potreba zavolat nekolik asynchronnich operaci za sebou, vzdy pouzit async/await syntaxi, nikdy ne callbacky nebo .then()
   - kontrolovat po sobe chyby, hlavne !! eslint !!
  

  ## DOPORUCENE PRAVIDLA
  - pokud je potreba upravit stav na zaklade predchoziho stavu, vzdy pouzit funkci ve setStatus
    ```js
    // SPRAVNE
    setCount(prevCount => prevCount + 1);
     .  // SPATNE       
    setCount(count + 1);
    ``` 
