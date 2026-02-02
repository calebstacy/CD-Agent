/**
 * Seed script to populate the pattern library with realistic demo patterns
 * Run with: node scripts/seed-patterns.mjs
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
};

// Demo patterns from a fictional "TaskFlow" productivity app
const demoPatterns = [
  // BUTTONS - Primary Actions
  { componentType: 'button', text: 'Save', context: 'Primary save action', source: 'manual', abTestWinner: true, usageCount: 847 },
  { componentType: 'button', text: 'Save changes', context: 'Settings pages', source: 'manual', abTestWinner: false, usageCount: 234 },
  { componentType: 'button', text: 'Create task', context: 'Task creation flow', source: 'manual', abTestWinner: true, usageCount: 1203 },
  { componentType: 'button', text: 'Add to project', context: 'Task assignment', source: 'manual', usageCount: 456 },
  { componentType: 'button', text: 'Get started', context: 'Onboarding CTA', source: 'imported', abTestWinner: true, conversionLift: '23.5', usageCount: 2341 },
  { componentType: 'button', text: 'Start free trial', context: 'Pricing page', source: 'imported', abTestWinner: true, conversionLift: '18.2', usageCount: 1892 },
  { componentType: 'button', text: 'Upgrade now', context: 'Upgrade prompts', source: 'manual', usageCount: 567 },
  { componentType: 'button', text: 'Continue', context: 'Multi-step flows', source: 'manual', abTestWinner: true, usageCount: 3421 },
  { componentType: 'button', text: 'Done', context: 'Completion actions', source: 'manual', usageCount: 1234 },
  { componentType: 'button', text: 'Cancel', context: 'Secondary action in modals', source: 'manual', usageCount: 2156 },
  
  // BUTTONS - Destructive
  { componentType: 'button', text: 'Delete', context: 'Destructive actions', source: 'manual', usageCount: 892 },
  { componentType: 'button', text: 'Remove', context: 'List item removal', source: 'manual', usageCount: 567 },
  { componentType: 'button', text: 'Archive', context: 'Soft delete alternative', source: 'imported', userResearchValidated: true, usageCount: 234 },
  
  // ERROR MESSAGES
  { componentType: 'error', text: "Something went wrong. Please try again.", context: 'Generic error fallback', source: 'manual', usageCount: 1567 },
  { componentType: 'error', text: "We couldn't save your changes. Check your connection and try again.", context: 'Save failure', source: 'imported', userResearchValidated: true, usageCount: 423 },
  { componentType: 'error', text: "This email is already in use. Try signing in instead.", context: 'Signup duplicate email', source: 'imported', abTestWinner: true, usageCount: 892 },
  { componentType: 'error', text: "Your session has expired. Please sign in again.", context: 'Auth timeout', source: 'manual', usageCount: 345 },
  { componentType: 'error', text: "We couldn't find that page. It may have been moved or deleted.", context: '404 error', source: 'manual', usageCount: 234 },
  { componentType: 'error', text: "You don't have permission to view this. Contact your admin for access.", context: '403 error', source: 'imported', userResearchValidated: true, usageCount: 156 },
  { componentType: 'error', text: "File too large. Maximum size is 10MB.", context: 'Upload size limit', source: 'manual', usageCount: 567 },
  { componentType: 'error', text: "Invalid file type. Please upload a PNG, JPG, or PDF.", context: 'Upload type restriction', source: 'manual', usageCount: 234 },
  
  // EMPTY STATES
  { componentType: 'empty_state', text: "No tasks yet. Create your first task to get started.", context: 'Empty task list', source: 'manual', usageCount: 2341 },
  { componentType: 'empty_state', text: "Your inbox is empty. Nice work!", context: 'Empty inbox - positive', source: 'imported', abTestWinner: true, usageCount: 1234 },
  { componentType: 'empty_state', text: "No results found. Try adjusting your filters.", context: 'Empty search results', source: 'manual', usageCount: 892 },
  { componentType: 'empty_state', text: "No team members yet. Invite your first teammate.", context: 'Empty team list', source: 'manual', usageCount: 345 },
  { componentType: 'empty_state', text: "No activity this week. Check back soon.", context: 'Empty activity feed', source: 'manual', usageCount: 234 },
  { componentType: 'empty_state', text: "You haven't created any projects yet. Projects help you organize related tasks.", context: 'Empty projects - educational', source: 'imported', userResearchValidated: true, usageCount: 567 },
  
  // FORM LABELS
  { componentType: 'form_label', text: 'Email address', context: 'Email input field', source: 'manual', usageCount: 4567 },
  { componentType: 'form_label', text: 'Password', context: 'Password input field', source: 'manual', usageCount: 4234 },
  { componentType: 'form_label', text: 'Full name', context: 'Name input field', source: 'manual', usageCount: 3892 },
  { componentType: 'form_label', text: 'Task name', context: 'Task creation form', source: 'manual', usageCount: 2341 },
  { componentType: 'form_label', text: 'Description (optional)', context: 'Optional description field', source: 'manual', usageCount: 1892 },
  { componentType: 'form_label', text: 'Due date', context: 'Date picker label', source: 'manual', usageCount: 1567 },
  { componentType: 'form_label', text: 'Assignee', context: 'User selector label', source: 'manual', usageCount: 1234 },
  { componentType: 'form_label', text: 'Priority', context: 'Priority selector', source: 'manual', usageCount: 892 },
  
  // TOOLTIPS
  { componentType: 'tooltip', text: 'Click to copy link', context: 'Share button tooltip', source: 'manual', usageCount: 1234 },
  { componentType: 'tooltip', text: 'Mark as complete', context: 'Checkbox tooltip', source: 'manual', usageCount: 2341 },
  { componentType: 'tooltip', text: 'Add a comment', context: 'Comment button tooltip', source: 'manual', usageCount: 892 },
  { componentType: 'tooltip', text: 'View task details', context: 'Task row hover', source: 'manual', usageCount: 1567 },
  { componentType: 'tooltip', text: 'Keyboard shortcut: ⌘K', context: 'Command palette hint', source: 'manual', usageCount: 567 },
  
  // SUCCESS MESSAGES
  { componentType: 'success', text: 'Changes saved', context: 'Save confirmation', source: 'manual', usageCount: 3421 },
  { componentType: 'success', text: 'Task created', context: 'Task creation confirmation', source: 'manual', usageCount: 2341 },
  { componentType: 'success', text: 'Invite sent', context: 'Team invite confirmation', source: 'manual', usageCount: 567 },
  { componentType: 'success', text: 'Link copied to clipboard', context: 'Copy action confirmation', source: 'manual', usageCount: 1892 },
  { componentType: 'success', text: 'Welcome to TaskFlow!', context: 'Signup success', source: 'imported', abTestWinner: true, usageCount: 4567 },
  { componentType: 'success', text: 'Your trial has started. You have 14 days to explore.', context: 'Trial activation', source: 'imported', userResearchValidated: true, usageCount: 1234 },
  
  // NAVIGATION
  { componentType: 'navigation', text: 'Dashboard', context: 'Main nav item', source: 'manual', usageCount: 8923 },
  { componentType: 'navigation', text: 'My Tasks', context: 'Main nav item', source: 'manual', usageCount: 7234 },
  { componentType: 'navigation', text: 'Projects', context: 'Main nav item', source: 'manual', usageCount: 5678 },
  { componentType: 'navigation', text: 'Team', context: 'Main nav item', source: 'manual', usageCount: 3421 },
  { componentType: 'navigation', text: 'Settings', context: 'Main nav item', source: 'manual', usageCount: 2341 },
  { componentType: 'navigation', text: 'Help & Support', context: 'Footer nav', source: 'manual', usageCount: 892 },
  
  // HEADINGS
  { componentType: 'heading', text: 'Welcome back', context: 'Dashboard greeting', source: 'imported', abTestWinner: true, usageCount: 4567 },
  { componentType: 'heading', text: 'Get more done with TaskFlow', context: 'Marketing headline', source: 'imported', abTestWinner: true, conversionLift: '31.2', usageCount: 8923 },
  { componentType: 'heading', text: 'Your tasks for today', context: 'Today view header', source: 'manual', usageCount: 3421 },
  { componentType: 'heading', text: 'Account settings', context: 'Settings page header', source: 'manual', usageCount: 1234 },
  { componentType: 'heading', text: 'Invite your team', context: 'Team invite modal', source: 'manual', usageCount: 892 },
  
  // DESCRIPTIONS
  { componentType: 'description', text: 'Organize your work, hit deadlines, and collaborate with your team—all in one place.', context: 'Product tagline', source: 'imported', abTestWinner: true, usageCount: 5678 },
  { componentType: 'description', text: 'Tasks assigned to you that are due soon will appear here.', context: 'Dashboard section explanation', source: 'manual', usageCount: 2341 },
  { componentType: 'description', text: 'Projects help you group related tasks and share them with your team.', context: 'Projects explanation', source: 'imported', userResearchValidated: true, usageCount: 1234 },
  { componentType: 'description', text: 'Your changes will be saved automatically.', context: 'Autosave indicator', source: 'manual', usageCount: 3421 },
  
  // PLACEHOLDERS
  { componentType: 'placeholder', text: 'Search tasks, projects, and people...', context: 'Global search', source: 'manual', usageCount: 4567 },
  { componentType: 'placeholder', text: 'Add a task...', context: 'Quick add input', source: 'manual', usageCount: 6789 },
  { componentType: 'placeholder', text: 'Write a comment...', context: 'Comment input', source: 'manual', usageCount: 2341 },
  { componentType: 'placeholder', text: 'Enter your email', context: 'Email input', source: 'manual', usageCount: 3421 },
  { componentType: 'placeholder', text: 'What needs to be done?', context: 'Task name input', source: 'imported', abTestWinner: true, usageCount: 5678 },
  
  // CONFIRMATION DIALOGS
  { componentType: 'description', text: 'Are you sure you want to delete this task? This action cannot be undone.', context: 'Delete confirmation', source: 'manual', usageCount: 1234 },
  { componentType: 'description', text: 'You have unsaved changes. Are you sure you want to leave?', context: 'Unsaved changes warning', source: 'manual', usageCount: 892 },
  { componentType: 'description', text: 'This will remove the member from all projects. They will lose access immediately.', context: 'Remove team member', source: 'imported', userResearchValidated: true, usageCount: 345 },
];

async function seedPatterns() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('Connected to database');
    
    // Get admin user ID (assuming ID 1 for demo)
    const [users] = await connection.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    const userId = users[0]?.id || 1;
    
    console.log(`Using user ID: ${userId}`);
    
    // Clear existing demo patterns
    await connection.execute('DELETE FROM copy_patterns WHERE source IN ("design_system", "ab_test_winner", "user_research")');
    console.log('Cleared existing demo patterns');
    
    // Insert new patterns
    let inserted = 0;
    for (const pattern of demoPatterns) {
      await connection.execute(
        `INSERT INTO copy_patterns (userId, componentType, text, context, source, abTestWinner, userResearchValidated, conversionLift, usageCount, isApproved, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
        [
          userId,
          pattern.componentType,
          pattern.text,
          pattern.context,
          pattern.source,
          pattern.abTestWinner || false,
          pattern.userResearchValidated || false,
          pattern.conversionLift || null,
          pattern.usageCount || 0
        ]
      );
      inserted++;
    }
    
    console.log(`Inserted ${inserted} demo patterns`);
    
    // Show summary
    const [summary] = await connection.execute(
      'SELECT componentType, COUNT(*) as count FROM copy_patterns WHERE userId = ? GROUP BY componentType ORDER BY count DESC',
      [userId]
    );
    
    console.log('\nPattern summary by type:');
    for (const row of summary) {
      console.log(`  ${row.componentType}: ${row.count}`);
    }
    
  } finally {
    await connection.end();
  }
}

seedPatterns().catch(console.error);
