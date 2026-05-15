export const POLL_TEMPLATES = [
  {
    id: "food",
    name: "Food",
    category: "Food",
    title: "Where should we eat?",
    description: "Pick the best place or meal for the group.",
    ideas: ["Pizza", "Sushi", "Tacos", "Burgers"],
  },
  {
    id: "movies",
    name: "Movies",
    category: "Movies",
    title: "What should we watch?",
    description: "Choose a movie or show everyone can get behind.",
    ideas: ["Comedy", "Action", "Documentary", "Something new"],
  },
  {
    id: "travel",
    name: "Travel",
    category: "Travel",
    title: "Where should we go?",
    description: "Compare trip ideas and find the favorite.",
    ideas: ["Beach", "Mountains", "City weekend", "Road trip"],
  },
  {
    id: "team-lunch",
    name: "Team Lunch",
    category: "Team",
    title: "Team lunch plan",
    description: "Decide on a lunch option that works for the team.",
    ideas: ["Catering", "Food trucks", "Restaurant", "Bring your own"],
  },
  {
    id: "date-night",
    name: "Date Night",
    category: "Date Night",
    title: "Date night idea",
    description: "Pick a plan for the next night out.",
    ideas: ["Dinner", "Movie", "Live music", "Walk and dessert"],
  },
  {
    id: "family-activity",
    name: "Family Activity",
    category: "Family",
    title: "Family activity",
    description: "Find something fun for everyone.",
    ideas: ["Park", "Game night", "Museum", "Movie night"],
  },
  {
    id: "meeting-time",
    name: "Meeting Time",
    category: "Scheduling",
    title: "When should we meet?",
    description: "Vote on the best time for everyone.",
    ideas: ["Monday morning", "Tuesday afternoon", "Wednesday lunch", "Friday wrap-up"],
  },
];

export function getPollTemplate(id) {
  return POLL_TEMPLATES.find((template) => template.id === id) || POLL_TEMPLATES[0];
}
