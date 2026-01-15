# Border System Implementation - Setup Instructions

## Database Migration

To create the borders table, run the following SQL migration:

```sql
-- File: migrations/001_create_borders_table.sql
```

### Option 1: Using MySQL Command Line
```bash
mysql -u root -p expo_db < migrations/001_create_borders_table.sql
```

### Option 2: Using MySQL Workbench or phpMyAdmin
1. Open MySQL Workbench or phpMyAdmin
2. Select the `expo_db` database
3. Copy and paste the contents of `migrations/001_create_borders_table.sql`
4. Execute the SQL

### Option 3: Using Node.js script
```javascript
import fs from 'fs';
import pool from './config/db.js';

const runMigration = async () => {
  try {
    const sql = fs.readFileSync('./migrations/001_create_borders_table.sql', 'utf8');
    await pool.execute(sql);
    console.log('✅ Borders table created successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

runMigration();
```

## Restart Backend Server

After running the migration, restart the backend server:

```bash
cd expo_backend
npm run dev
```

## Test the API

Once the server is running, the following endpoints will be available:

- `GET /api/v1/borders` - Get all borders (requires authentication)
- `GET /api/v1/borders/:id` - Get single border by ID
- `POST /api/v1/borders` - Create new border (requires admin)
- `PUT /api/v1/borders/:id` - Update border (requires admin)
- `DELETE /api/v1/borders/:id` - Delete border (requires admin)
- `POST /api/v1/borders/check-collision` - Check collision with booths (requires admin)

## Test Border Creation from Web UI

1. Open the web application (expo_web)
2. Log in as an admin user
3. Click the "Add Border" button (amber/orange color)
4. Fill in the border details:
   - Select type: Structural, Zone, or Pathway
   - Choose orientation: Horizontal or Vertical
   - Set length: 10-100 meters
   - Set position: X and Y coordinates
5. Click "Create Border"
6. The border should appear on the map immediately

## Verification

Check that:
- ✅ Backend server starts without errors
- ✅ borders table exists in database
- ✅ POST request to `/api/v1/borders` returns 201 status
- ✅ GET request to `/api/v1/borders` returns array of borders
- ✅ Borders appear on the map in the web UI

## Files Modified

### Backend (expo_backend):
- ✅ `models/Border.js` - Database model with CRUD operations
- ✅ `controllers/borderController.js` - Request handlers
- ✅ `routes/borders.routes.js` - Express routes
- ✅ `index.js` - Registered border routes
- ✅ `migrations/001_create_borders_table.sql` - Database schema

### Frontend (expo_web):
- ✅ `src/pages/map/map.jsx` - Border UI and state management
- ✅ `src/api/borders.js` - API client functions
- ✅ `src/Components/InteractiveMap/InteractiveMap.jsx` - Border rendering

## Notes

- All border write operations require admin authentication
- Static borders (is_static=true) cannot be modified or deleted
- Border collision detection available via `/check-collision` endpoint
- Frontend automatically refreshes borders after create/update/delete
