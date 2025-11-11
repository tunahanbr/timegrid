import { storage } from "./storage";

export const initializeApp = () => {
  // Initialize with default projects if none exist
  const projects = storage.getProjects();
  
  if (projects.length === 0) {
    storage.addProject({
      name: "Development",
      color: "#0A84FF",
    });
    storage.addProject({
      name: "Design",
      color: "#BF5AF2",
    });
    storage.addProject({
      name: "Meetings",
      color: "#FF9F0A",
    });
  }
};
