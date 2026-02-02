export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  prompt: string;
}

export const slashCommands: SlashCommand[] = [
  {
    command: '/iterate',
    label: 'Iterate on copy',
    description: 'Help me refine and improve existing copy',
    prompt: "I'd like to iterate on some copy I've written. Can you help me think through different variations and improvements?"
  },
  {
    command: '/brainstorm',
    label: 'Brainstorm ideas',
    description: 'Generate multiple creative options',
    prompt: "Let's brainstorm together. I need help generating multiple creative options for this content challenge."
  },
  {
    command: '/review',
    label: 'Review my copy',
    description: 'Get feedback on existing content',
    prompt: "I'd like you to review some copy I've written and give me thoughtful feedback on what's working and what could be stronger."
  },
  {
    command: '/shorten',
    label: 'Make it shorter',
    description: 'Condense without losing meaning',
    prompt: "I need to make this copy shorter while keeping the core message. Can you help me find the most concise way to say this?"
  },
  {
    command: '/clarify',
    label: 'Make it clearer',
    description: 'Improve clarity and understanding',
    prompt: "This copy feels unclear or confusing. Can you help me make it more straightforward and easier to understand?"
  },
  {
    command: '/tone',
    label: 'Adjust tone',
    description: 'Change the voice or feeling',
    prompt: "I want to adjust the tone of this copy. Let's talk through different ways to say this with a different voice or feeling."
  },
  {
    command: '/error',
    label: 'Error message help',
    description: 'Write empathetic error copy',
    prompt: "I'm working on an error message. Help me think through how to communicate this problem in a way that's helpful and not frustrating."
  },
  {
    command: '/cta',
    label: 'Call-to-action',
    description: 'Write compelling CTAs',
    prompt: "I need help with a call-to-action. Let's explore different ways to motivate users to take this action."
  },
  {
    command: '/onboarding',
    label: 'Onboarding copy',
    description: 'Welcome and guide new users',
    prompt: "I'm designing an onboarding flow. Help me think through how to welcome users and guide them through their first experience."
  },
  {
    command: '/empty',
    label: 'Empty state',
    description: 'Fill blank spaces meaningfully',
    prompt: "I'm working on an empty state—when there's no content yet. How can I make this moment helpful instead of just blank?"
  },
  {
    command: '/microcopy',
    label: 'Microcopy help',
    description: 'Small but important text',
    prompt: "I need help with some microcopy—those small bits of text like button labels, tooltips, or form hints. Let's make them work harder."
  },
  {
    command: '/accessibility',
    label: 'Accessibility check',
    description: 'Make content more inclusive',
    prompt: "Can you help me review this copy for accessibility? I want to make sure it's clear and inclusive for all users."
  }
];
