# Hierarchy V2 - Quick Test Guide

## Test Setup

### 1. Database Check
```sql
-- Zkontrolovat že tabulka existuje
SHOW CREATE TABLE 25_hierarchie_vztahy;

-- Zkontrolovat existing data
SELECT * FROM 25_hierarchie_vztahy WHERE profil_id = 1;
```

### 2. Backend API Test

**Test Load (curl)**:
```bash
curl -X POST http://your-domain/api.eeo/hierarchy/structure \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_jwt_token",
    "username": "admin",
    "profile_id": 1
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "user-85",
        "type": "user",
        "userId": 85,
        "name": "Jan Novák",
        "position": "Manager",
        "initials": "JN"
      }
    ],
    "relations": [
      {
        "id": 1,
        "type": "user-user",
        "node_1": "user-85",
        "node_2": "user-52",
        "position_1": {"x": 100, "y": 200},
        "position_2": {"x": 300, "y": 200}
      }
    ]
  }
}
```

### 3. Frontend Test

**Open Browser Console** and check logs:
```
📦 V2 Received from API: X nodes, Y relations
✅ V2 Created nodes: X
✅ V2 Created edges: Y
```

## Test Scenarios

### Scenario 1: Simple User-User Hierarchy
1. ✅ Open Hierarchy page
2. ✅ Add 2 users from left panel
3. ✅ Connect them with edge
4. ✅ Move nodes to specific positions
5. ✅ Click Save
6. ✅ Reload page (F5)
7. ✅ **VERIFY**: Nodes appear in exact same positions

### Scenario 2: User-Location Hierarchy
1. ✅ Add 1 user
2. ✅ Add 1 location
3. ✅ Connect user → location
4. ✅ Set permissions (visibility flags)
5. ✅ Save
6. ✅ Reload
7. ✅ **VERIFY**: Relationship preserved, permissions intact

### Scenario 3: Complex Multi-Level
1. ✅ Create hierarchy:
   ```
   Manager (user-85)
     ├─ Team Lead (user-52)
     │   └─ Developer (user-23)
     └─ Praha Office (location-16)
         └─ IT Department (department-5)
   ```
2. ✅ Arrange nodes in tree layout
3. ✅ Save
4. ✅ Reload
5. ✅ **VERIFY**: All 5 nodes, 4 edges, exact positions preserved

### Scenario 4: Notifications & Permissions
1. ✅ Create user-user edge
2. ✅ Click edge to open detail panel
3. ✅ Set:
   - Level: 2
   - Visibility: Orders=true, Invoices=true, Others=false
   - Notifications: Email=true, InApp=true, Types=['objednavka']
4. ✅ Save
5. ✅ Reload
6. ✅ Click edge again
7. ✅ **VERIFY**: All settings preserved

## Debugging

### Check API Payload (Save)

Open Network tab, filter for `hierarchy/save`, inspect payload:
```json
{
  "token": "...",
  "username": "admin", 
  "profile_id": 1,
  "relations": [
    {
      "type": "user-user",
      "user_id_1": 85,
      "user_id_2": 52,
      "position_1": {"x": 143, "y": 234},
      "position_2": {"x": 456, "y": 123},
      "level": 1,
      "visibility": {
        "objednavky": true,
        "faktury": true,
        "smlouvy": true,
        "pokladna": true,
        "uzivatele": true,
        "lp": true
      },
      "notifications": {
        "email": false,
        "inapp": true,
        "types": []
      }
    }
  ]
}
```

### Check Database After Save

```sql
SELECT 
  id,
  typ_vztahu,
  user_id_1,
  user_id_2,
  lokalita_id,
  usek_id,
  pozice_node_1,
  pozice_node_2
FROM 25_hierarchie_vztahy
WHERE profil_id = 1
ORDER BY id DESC
LIMIT 5;
```

Should show JSON positions like: `{"x": 143, "y": 234}`

### Check Console Errors

Look for:
- ❌ `Relation node not found` - means node lookup failed
- ❌ `Cannot read property 'userId' of undefined` - data structure issue
- ❌ `fetch failed` - API connection problem

### Common Issues

**Problem**: Nodes appear but edges missing  
**Fix**: Check `flowEdges.filter(e => e !== null)` - relations might be filtered out due to node lookup failure

**Problem**: Positions wrong after reload  
**Fix**: Check `rel.position_1` and `rel.position_2` in API response - should be `{x, y}` objects not null

**Problem**: Save fails with 500 error  
**Fix**: Check PHP error log, likely SQL syntax or missing column

**Problem**: Nodes in grid layout after reload  
**Fix**: Positions not stored - check `position_1/2` in save payload, verify JSON encoding

## Success Criteria

✅ **PASS** if:
1. Save completes without errors
2. API returns success response
3. Database contains correct data
4. Reload shows exact same hierarchy
5. Positions match pixel-perfect
6. All edges connect correct nodes
7. Permissions/notifications preserved

❌ **FAIL** if:
- Nodes jump to different positions
- Edges disappear
- Console shows errors
- API returns errors
- Database empty after save

## Performance Test

For large hierarchies (50+ nodes):
1. Create 50 users
2. Create 20 edges
3. Measure save time (should be < 2 seconds)
4. Measure load time (should be < 3 seconds)
5. Check memory usage (should not spike)

## Next Steps After Test

If tests pass:
- ✅ Remove old V1 handler code
- ✅ Update production config
- ✅ Deploy to staging
- ✅ User acceptance testing

If tests fail:
- 🐛 Check specific scenario that failed
- 🐛 Review logs (console + PHP error log)
- 🐛 Add more debug output
- 🐛 Fix and retest
