'use client';
import { showCommercialPublicPreview } from './CommercialPublicPreview';
import { useState } from 'react';
import { projectGalleryFilters, type GalleryFilter } from '@/lib/gallery-filters';

export default function GalleryUploadFields({projects}: {projects:{slug:string;name:string;galleryFilters?:GalleryFilter[];lots:{ref:string;code:string}[]}[]}) {
  const [slug,setSlug]=useState(projects[0]?.slug??'');const [lot,setLot]=useState('');
  const project=projects.find(project=>project.slug===slug);
  return <>
    <label className="block text-sm">Résidence<select className="field mt-2" name="project" value={slug} onChange={event=>{setSlug(event.target.value);setLot('');showCommercialPublicPreview(`/projets/${event.target.value}`);}} required>{projects.map(project=><option key={project.slug} value={project.slug}>{project.name}</option>)}</select></label>
    <label className="block text-sm">Appartement<select className="field mt-2" name="lot" value={lot} onChange={event=>{setLot(event.target.value);showCommercialPublicPreview(event.target.value?`/projets/${slug}/appartements/${event.target.value}`:`/projets/${slug}`);}}><option value="">Toute la résidence</option>{project?.lots.map(lot=><option key={lot.ref} value={lot.ref}>{lot.code}</option>)}</select></label>
    {!lot && project && <label key={slug} className="block text-sm">Rubrique de la galerie<select className="field mt-2" name="category" defaultValue=""><option value="">Galerie générale</option>{projectGalleryFilters(project).map(filter=><option key={filter.id} value={filter.id}>{filter.label.fr}</option>)}</select></label>}
  </>;
}
