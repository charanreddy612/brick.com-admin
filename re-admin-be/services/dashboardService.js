import * as projectRepo from "../dbhelper/ProjectRepo.js";
import * as developerRepo from "../dbhelper/DeveloperRepo.js";
import * as blogRepo from "../dbhelper/BlogRepo.js";

export async function getDashboardSummary() {
  const [totalProjects, totalDevelopers, publishedBlogs] = await Promise.all([
    projectRepo.count(),
    developerRepo.count(),
    blogRepo.countPublished(),
  ]);

  return { totalProjects, totalDevelopers, publishedBlogs };
}
