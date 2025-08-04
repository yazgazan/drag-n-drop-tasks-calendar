import { Task } from '../types/task';

export const sampleTasks: Task[] = [
  {
    id: 1,
    title: "Find the perfect GIF for every emotion",
    description: "Research emotional expression through animated imagery",
    priority: "p1",
    labels: ["research", "fun", "urgent"]
  },
  {
    id: 2,
    title: "Teach my cat to high-five (attempt #47)",
    description: "Persistence is key. Maybe try bribing with tuna this time.",
    priority: "p2",
    labels: ["pets", "training", "ambitious"]
  },
  {
    id: 3,
    title: "Research if penguins would make good office assistants",
    description: "Consider their organizational skills and fish budget requirements",
    priority: "p3",
    labels: ["hr", "animals", "brainstorm"]
  },
  {
    id: 4,
    title: "Create a playlist for plants to boost photosynthesis",
    description: "Mozart vs. Death Metal - what do ferns prefer?",
    priority: "p4",
    labels: ["music", "plants", "science"]
  },
  {
    id: 5,
    title: "Convince aliens to review my resume",
    description: "Intergalactic networking for career advancement",
    priority: "p1",
    labels: ["career", "networking", "space"]
  },
  {
    id: 6,
    title: "Build a fort out of post-it notes",
    description: "Architectural masterpiece using office supplies",
    priority: "p3",
    labels: ["creative", "office", "architecture"]
  },
  {
    id: 7,
    title: "Learn to speak whale",
    description: "Expand communication skills beyond human languages",
    priority: "p4",
    labels: ["language", "marine-biology", "personal-growth"]
  },
  {
    id: 8,
    title: "Organize sock drawer by emotional state",
    description: "Happy socks go with Tuesday socks, obviously",
    priority: "p2",
    labels: ["organization", "psychology", "wardrobe"]
  },
  {
    id: 9,
    title: "Start a support group for abandoned USB cables",
    description: "They need love too. Meeting in the junk drawer.",
    priority: "p3",
    labels: ["tech", "charity", "declutter"]
  },
  {
    id: 10,
    title: "Perfect the art of procrastination",
    description: "Schedule it for tomorrow... or next week",
    priority: "p4",
    labels: ["meta", "philosophy", "ironic"]
  }
];

export const timeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"
];

export const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];