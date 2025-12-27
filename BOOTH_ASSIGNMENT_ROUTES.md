# Booth Assignment API Routes

This document describes the required API routes for automatic booth assignment from Companies and Projects tables.

## Required Backend Routes

### Companies Routes

```javascript
// GET /api/companies/unassigned
// Get all companies without booth assignment
router.get('/companies/unassigned', async (req, res) => {
  const companies = await Company.findAll({
    where: { booth_id: null }
  });
  res.json({ data: companies });
});

// PATCH /api/companies/:companyId/assign-booth
// Assign booth to company
router.patch('/companies/:companyId/assign-booth', async (req, res) => {
  const { companyId } = req.params;
  const { booth_id } = req.body;
  
  const company = await Company.update(
    { booth_id },
    { where: { company_id: companyId } }
  );
  
  res.json({ success: true, data: company });
});

// PATCH /api/companies/:companyId/unassign-booth
// Remove booth assignment from company
router.patch('/companies/:companyId/unassign-booth', async (req, res) => {
  const { companyId } = req.params;
  
  const company = await Company.update(
    { booth_id: null },
    { where: { company_id: companyId } }
  );
  
  res.json({ success: true, data: company });
});
```

### Projects Routes

```javascript
// GET /api/projects/unassigned
// Get all approved projects without booth assignment
router.get('/projects/unassigned', async (req, res) => {
  const projects = await Project.findAll({
    where: { 
      booth: null,
      status: 'approved'
    }
  });
  res.json({ data: projects });
});

// PATCH /api/projects/:projectId/assign-booth
// Assign booth to project
router.patch('/projects/:projectId/assign-booth', async (req, res) => {
  const { projectId } = req.params;
  const { booth } = req.body; // booth label like "1", "2", etc.
  
  const project = await Project.update(
    { booth },
    { where: { project_id: projectId } }
  );
  
  res.json({ success: true, data: project });
});

// PATCH /api/projects/:projectId/unassign-booth
// Remove booth assignment from project
router.patch('/projects/:projectId/unassign-booth', async (req, res) => {
  const { projectId } = req.params;
  
  const project = await Project.update(
    { booth: null },
    { where: { project_id: projectId } }
  );
  
  res.json({ success: true, data: project });
});
```

### Booths Routes (Enhanced)

```javascript
// GET /api/booths
// Get all booths WITH their assignments (JOIN with companies/projects)
router.get('/booths', async (req, res) => {
  const booths = await Booth.findAll({
    include: [
      {
        model: Company,
        as: 'company',
        required: false
      }
    ]
  });
  
  // For each booth, also check if any project has this booth
  const boothsWithAssignments = await Promise.all(
    booths.map(async (booth) => {
      const project = await Project.findOne({
        where: { booth: booth.booth_number }
      });
      
      return {
        ...booth.toJSON(),
        project: project || null,
        assignee: booth.company?.company_name || project?.title || null
      };
    })
  );
  
  res.json({ data: boothsWithAssignments });
});

// PUT /api/booths/:boothId/assign
// Assign booth to either project OR company
router.put('/booths/:boothId/assign', async (req, res) => {
  const { boothId } = req.params;
  const { projectId, companyId } = req.body;
  
  const booth = await Booth.findByPk(boothId);
  if (!booth) {
    return res.status(404).json({ error: 'Booth not found' });
  }
  
  if (projectId) {
    // Assign to project
    await Project.update(
      { booth: booth.booth_number },
      { where: { project_id: projectId } }
    );
  } else if (companyId) {
    // Assign to company
    await Company.update(
      { booth_id: boothId },
      { where: { company_id: companyId } }
    );
  }
  
  res.json({ success: true, data: booth });
});

// PUT /api/booths/:boothId/unassign
// Remove all assignments from booth
router.put('/booths/:boothId/unassign', async (req, res) => {
  const { boothId } = req.params;
  
  const booth = await Booth.findByPk(boothId);
  if (!booth) {
    return res.status(404).json({ error: 'Booth not found' });
  }
  
  // Remove from company
  await Company.update(
    { booth_id: null },
    { where: { booth_id: boothId } }
  );
  
  // Remove from project
  await Project.update(
    { booth: null },
    { where: { booth: booth.booth_number } }
  );
  
  res.json({ success: true, data: booth });
});
```

## Database Relationships

### Sequelize Models

```javascript
// Company model
Company.belongsTo(Booth, {
  foreignKey: 'booth_id',
  as: 'assignedBooth'
});

Booth.hasMany(Company, {
  foreignKey: 'booth_id',
  as: 'companies'
});

// Project model (string reference via booth label)
// No direct foreign key, use booth number as string reference
```

## Frontend Usage

### Auto-load Booths with Assignments

```javascript
const loadBooths = async () => {
  const data = await boothsAPI.getAllBooths();
  
  // Data now includes:
  // {
  //   booth_id: "...",
  //   booth_number: "1",
  //   location_x: 100,
  //   location_y: 200,
  //   company: { company_name: "ABC Corp" },
  //   project: { title: "My Project" },
  //   assignee: "ABC Corp" or "My Project"
  // }
  
  setBooths(data);
};
```

### Assign Booth

```javascript
const handleAssign = async (boothId, assignment) => {
  await boothsAPI.assignBooth(boothId, assignment);
  
  // Refresh to show updated assignments
  loadBooths();
};
```

## Implementation Checklist

- [ ] Add Company routes (unassigned, assign-booth, unassign-booth)
- [ ] Add Project routes (unassigned, assign-booth, unassign-booth)
- [ ] Update Booth GET route to JOIN with companies/projects
- [ ] Update Booth assign/unassign routes
- [ ] Add Sequelize associations (Company -> Booth)
- [ ] Test all endpoints with Postman/Insomnia
- [ ] Verify frontend receives assignment data correctly
