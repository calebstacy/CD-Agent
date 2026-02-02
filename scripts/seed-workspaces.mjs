import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log("🌱 Seeding demo workspaces...\n");

  // Create Meta-wide foundation workspace
  const [metaResult] = await connection.execute(
    `INSERT INTO workspaces (name, slug, description, icon, color, ownerId, isPublic, parentId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Meta Content Design",
      "meta",
      "Company-wide content design standards and guidelines",
      "🌐",
      "#0668E1",
      1,
      true,
      null
    ]
  );
  const metaId = metaResult.insertId;
  console.log(`✅ Created Meta workspace (ID: ${metaId})`);

  // Create Reality Labs workspace (inherits from Meta)
  const [rlResult] = await connection.execute(
    `INSERT INTO workspaces (name, slug, description, icon, color, ownerId, isPublic, parentId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Reality Labs",
      "reality-labs",
      "VR/AR product content design",
      "🥽",
      "#7C3AED",
      1,
      false,
      metaId
    ]
  );
  const rlId = rlResult.insertId;
  console.log(`✅ Created Reality Labs workspace (ID: ${rlId})`);

  // Create Horizon workspace (inherits from Reality Labs)
  const [horizonResult] = await connection.execute(
    `INSERT INTO workspaces (name, slug, description, icon, color, ownerId, isPublic, parentId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Horizon",
      "horizon",
      "Horizon Worlds and social VR experiences",
      "🌅",
      "#EC4899",
      1,
      false,
      rlId
    ]
  );
  const horizonId = horizonResult.insertId;
  console.log(`✅ Created Horizon workspace (ID: ${horizonId})`);

  // Create Instagram workspace (inherits from Meta)
  const [igResult] = await connection.execute(
    `INSERT INTO workspaces (name, slug, description, icon, color, ownerId, isPublic, parentId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Instagram",
      "instagram",
      "Instagram app content design",
      "📸",
      "#E1306C",
      1,
      false,
      metaId
    ]
  );
  const igId = igResult.insertId;
  console.log(`✅ Created Instagram workspace (ID: ${igId})`);

  // Create WhatsApp workspace (inherits from Meta)
  const [waResult] = await connection.execute(
    `INSERT INTO workspaces (name, slug, description, icon, color, ownerId, isPublic, parentId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "WhatsApp",
      "whatsapp",
      "WhatsApp messaging content design",
      "💬",
      "#25D366",
      1,
      false,
      metaId
    ]
  );
  const waId = waResult.insertId;
  console.log(`✅ Created WhatsApp workspace (ID: ${waId})`);

  console.log("\n📚 Adding knowledge documents...\n");

  // Meta-wide knowledge documents
  const metaKnowledge = [
    {
      title: "Meta Voice & Tone Guidelines",
      description: "Company-wide voice and tone principles",
      category: "voice_tone",
      content: `# Meta Voice & Tone Guidelines

## Our Voice
Meta's voice is **human, helpful, and forward-looking**. We speak to people, not at them.

### Core Principles

1. **Be clear, not clever**
   - Prioritize understanding over creativity
   - Avoid jargon and technical terms when simpler words work
   - Write at an 8th-grade reading level

2. **Be helpful, not promotional**
   - Focus on what the user can do, not what we built
   - Lead with the benefit, not the feature
   - Anticipate questions and answer them proactively

3. **Be human, not robotic**
   - Use contractions (you're, we'll, it's)
   - Write in active voice
   - Address the user directly as "you"

4. **Be inclusive, not exclusive**
   - Use gender-neutral language
   - Avoid idioms that don't translate globally
   - Consider cultural context

## Tone Spectrum

Our tone adapts to context while maintaining our voice:

| Context | Tone | Example |
|---------|------|---------|
| Success | Warm, celebratory | "You're all set! Your changes have been saved." |
| Error | Calm, helpful | "Something went wrong. Let's try that again." |
| Onboarding | Encouraging, clear | "Welcome! Let's get you started." |
| Security | Serious, reassuring | "We take your privacy seriously. Here's what we're doing to protect you." |

## Words We Use / Don't Use

| Use | Don't Use |
|-----|-----------|
| Sign in | Log in |
| Sign out | Log out |
| Turn on/off | Enable/Disable |
| Learn more | Click here |
| Something went wrong | Error occurred |
| Try again | Retry |`
    },
    {
      title: "Accessibility Writing Guidelines",
      description: "Standards for accessible content",
      category: "accessibility",
      content: `# Accessibility Writing Guidelines

## Screen Reader Considerations

### Button Labels
- Use action verbs: "Save", "Send", "Delete"
- Be specific: "Save changes" not just "Save" when context matters
- Avoid "Click here" - it provides no context

### Link Text
- Make links descriptive: "View your privacy settings" not "Click here"
- Don't use URLs as link text
- Indicate if link opens in new window: "Privacy Policy (opens in new tab)"

### Alt Text
- Describe the image's purpose, not just its appearance
- For decorative images, use empty alt=""
- For functional images (buttons), describe the action

### Error Messages
- Identify the field with the error
- Explain what went wrong
- Provide a solution

**Bad:** "Invalid input"
**Good:** "Email address must include @ symbol"

## Cognitive Accessibility

### Simplify Language
- Use short sentences (under 25 words)
- One idea per paragraph
- Break complex processes into steps

### Reduce Cognitive Load
- Use consistent terminology
- Provide clear next steps
- Avoid double negatives

### Time-Sensitive Content
- Give users enough time to read
- Warn before timeouts
- Allow users to extend time limits`
    },
    {
      title: "Button Copy Best Practices",
      description: "Research-backed guidelines for button text",
      category: "best_practices",
      content: `# Button Copy Best Practices

## Research Findings

### Character Limits
- Primary CTAs: 2-4 words (15-25 characters)
- Secondary actions: 1-3 words
- Mobile: Even shorter due to tap targets

### A/B Test Winners

| Original | Winner | Lift |
|----------|--------|------|
| Submit | Get started | +23% |
| Click here | Learn more | +18% |
| Register | Create account | +15% |
| Buy now | Add to cart | +12% |

### Action Verb Patterns

**Starting actions:**
- Get started
- Begin
- Start free trial

**Continuing actions:**
- Continue
- Next
- Keep going

**Completing actions:**
- Done
- Finish
- Complete

**Saving actions:**
- Save
- Save changes
- Save and continue

### Context Matters

The same action might need different copy:

| Context | Copy |
|---------|------|
| Form completion | Save |
| Settings page | Save changes |
| Document editor | Save draft |
| Checkout | Save for later |`
    }
  ];

  for (const doc of metaKnowledge) {
    const [result] = await connection.execute(
      `INSERT INTO knowledge_documents (workspaceId, title, description, category, content, sourceType)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [metaId, doc.title, doc.description, doc.category, doc.content, "manual"]
    );
    console.log(`  📄 Added: ${doc.title}`);
  }

  // Horizon-specific knowledge
  const horizonKnowledge = [
    {
      title: "Horizon Voice Guidelines",
      description: "VR-specific voice and tone for Horizon",
      category: "voice_tone",
      content: `# Horizon Voice Guidelines

## VR-Specific Considerations

### Immersion First
In VR, text competes with the 3D environment. Every word must earn its place.

**Principles:**
- Be brief - users are in an experience, not reading a document
- Be spatial - reference the user's environment when helpful
- Be present - use present tense, the user is "here" not "there"

### Tone in Virtual Spaces

| Context | Tone | Example |
|---------|------|---------|
| Welcome | Warm, exciting | "Welcome to Horizon! Look around—this is your space." |
| Tutorial | Patient, encouraging | "Try reaching out and grabbing that object." |
| Social | Friendly, inclusive | "Wave to say hi!" |
| Safety | Calm, empowering | "You're in control. Take a break anytime." |

## VR-Specific Terminology

| Use | Don't Use | Why |
|-----|-----------|-----|
| Look at | Click on | No mouse in VR |
| Reach for | Select | Physical metaphor |
| Your space | The room | Personal ownership |
| Take a break | Exit | Less abrupt |

## Character Limits in VR

VR text must be readable at a distance:
- Headlines: 3-5 words max
- Body: 10-15 words per line
- Buttons: 1-2 words

## Spatial UI Copy

When UI elements are in 3D space:
- "Look here" → points to location
- "Behind you" → spatial awareness
- "Above your hand" → body-relative`
    },
    {
      title: "Horizon Safety & Comfort",
      description: "Content for safety features and comfort settings",
      category: "component_guidelines",
      content: `# Horizon Safety & Comfort Copy

## Personal Boundary System

### Activation Messages
- "Personal space activated" (when boundary is triggered)
- "You're protected" (reassurance)
- "They can't reach you here" (explaining the feature)

### Settings Copy
- "Personal Boundary" (feature name)
- "Keep others at a comfortable distance" (description)
- "Adjust how close others can get to you" (settings explanation)

## Break Reminders

### Gentle Prompts
- "You've been in VR for a while. How about a quick break?"
- "Time for a breather? Your world will be here when you get back."
- "Taking breaks helps you enjoy VR longer."

### After Long Sessions
- "You've been exploring for 2 hours. Your eyes will thank you for a break."
- "Great session! Step back into the real world for a bit."

## Reporting & Blocking

### Report Flow
- "Report this person" (action)
- "What happened?" (question)
- "Thanks for letting us know. We'll look into it." (confirmation)

### Block Confirmation
- "Block [Name]?"
- "They won't be able to see or interact with you."
- "[Name] has been blocked. You can unblock them anytime in Settings."`
    }
  ];

  for (const doc of horizonKnowledge) {
    const [result] = await connection.execute(
      `INSERT INTO knowledge_documents (workspaceId, title, description, category, content, sourceType)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [horizonId, doc.title, doc.description, doc.category, doc.content, "manual"]
    );
    console.log(`  📄 Added: ${doc.title}`);
  }

  // Instagram-specific knowledge
  const igKnowledge = [
    {
      title: "Instagram Voice Guidelines",
      description: "Instagram's unique voice and personality",
      category: "voice_tone",
      content: `# Instagram Voice Guidelines

## Brand Personality

Instagram is **expressive, inclusive, and inspiring**. We celebrate creativity and connection.

### Voice Characteristics

1. **Expressive**
   - Embrace emoji where appropriate 🎉
   - Celebrate achievements enthusiastically
   - Match the creative energy of our community

2. **Inclusive**
   - "Your story matters"
   - Avoid assumptions about identity
   - Celebrate diverse perspectives

3. **Inspiring**
   - Encourage creativity
   - Highlight possibilities
   - Support self-expression

## Tone by Feature

| Feature | Tone | Example |
|---------|------|---------|
| Stories | Playful, ephemeral | "Share your moment ✨" |
| Reels | Energetic, creative | "Create something amazing" |
| DMs | Personal, warm | "Start a conversation" |
| Shop | Helpful, trustworthy | "Shop from creators you love" |

## Instagram-Specific Terms

| Use | Context |
|-----|---------|
| Post | Static feed content |
| Story | 24-hour content |
| Reel | Short-form video |
| Creator | Content makers |
| Community | Our users collectively |

## Emoji Guidelines

✅ Use emoji to:
- Celebrate ("You did it! 🎉")
- Add warmth ("Thanks for being here 💜")
- Guide attention ("New ✨")

❌ Don't use emoji:
- In error messages
- In legal/policy text
- Excessively (max 1-2 per message)`
    }
  ];

  for (const doc of igKnowledge) {
    const [result] = await connection.execute(
      `INSERT INTO knowledge_documents (workspaceId, title, description, category, content, sourceType)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [igId, doc.title, doc.description, doc.category, doc.content, "manual"]
    );
    console.log(`  📄 Added: ${doc.title}`);
  }

  // WhatsApp-specific knowledge
  const waKnowledge = [
    {
      title: "WhatsApp Voice Guidelines",
      description: "WhatsApp's simple, trustworthy voice",
      category: "voice_tone",
      content: `# WhatsApp Voice Guidelines

## Brand Essence

WhatsApp is **simple, private, and reliable**. We're the trusted way to stay in touch.

### Voice Principles

1. **Simple**
   - Use the fewest words possible
   - Avoid technical jargon
   - One idea per message

2. **Private**
   - Reassure about encryption
   - Never mention message content
   - Respect personal space

3. **Reliable**
   - Be consistent
   - Set clear expectations
   - Follow through on promises

## Tone Spectrum

| Context | Tone | Example |
|---------|------|---------|
| Messaging | Neutral, clear | "Message sent" |
| Calls | Helpful | "Connecting..." |
| Privacy | Reassuring | "Your messages are end-to-end encrypted" |
| Errors | Calm, solution-focused | "Couldn't send. Tap to retry." |

## WhatsApp-Specific Patterns

### Status Messages
- Keep under 5 words
- No punctuation needed for single phrases
- Present tense

Examples:
- "Typing..."
- "Online"
- "Last seen today at 3:45 PM"

### Encryption Messaging
Always include when relevant:
- "End-to-end encrypted"
- "Only you and [contact] can read this"
- "Not even WhatsApp can read your messages"

### Error Patterns
Structure: What happened + What to do

- "Message not sent. Check your connection."
- "Call failed. Try again."
- "Couldn't download. Tap to retry."`
    }
  ];

  for (const doc of waKnowledge) {
    const [result] = await connection.execute(
      `INSERT INTO knowledge_documents (workspaceId, title, description, category, content, sourceType)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [waId, doc.title, doc.description, doc.category, doc.content, "manual"]
    );
    console.log(`  📄 Added: ${doc.title}`);
  }

  console.log("\n✅ Workspace seeding complete!");
  console.log(`
Summary:
- Meta (foundation) - ID: ${metaId}
  └── Reality Labs - ID: ${rlId}
      └── Horizon - ID: ${horizonId}
  └── Instagram - ID: ${igId}
  └── WhatsApp - ID: ${waId}
  `);

  await connection.end();
}

seed().catch(console.error);
