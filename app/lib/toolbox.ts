import type { PortfolioItem } from '@/app/lib/api';

export const toolboxProject: PortfolioItem = {
  id: 'akeluwa-toolbox', slug: 'akeluwa-toolbox', title: 'AkeluwaToolBox',
  summary: 'Free PDF and photo tools. Compress, edit, convert and merge files, extract PDF pages, and remove image backgrounds in your browser.',
  technologies: 'JavaScript / PDF.js / pdf-lib', project_url: '/akeluwatoolbox/',
  position: 0, active: true, created_at: '', updated_at: '',
};

export function withToolbox(items: PortfolioItem[]): PortfolioItem[] {
  return [toolboxProject, ...items.filter(item =>
    item.title.toLowerCase().replace(/[^a-z0-9]/g, '') !== 'akeluwatoolbox'
    && item.slug !== toolboxProject.slug
    && !/^\/akeluwatoolbox(?:\/|$)/.test(item.project_url || '')
  )];
}
