import type { Project } from './types';
import photos from './marassim-photos-20261022.json';

const BATCH = 'marassim-20261022';

/** Add the owner's photographs to existing records once, preserving admin edits. */
export function withMarassimPhotos(project: Project): Project {
  if (project.slug !== 'complexe-marassim' || project.galleryImports?.includes(BATCH)) return project;
  const existing = new Set(project.gallery.map(photo => photo.src));
  const additions = photos.filter(photo => !existing.has(photo.src));
  return {
    ...project,
    gallery: project.galleryEdited ? [...project.gallery, ...additions] : [...additions, ...project.gallery],
    galleryImports: [...(project.galleryImports ?? []), BATCH],
  };
}
