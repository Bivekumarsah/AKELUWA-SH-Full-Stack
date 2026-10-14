import type { PortfolioItem } from '@/app/lib/api';

export const toolboxProject: PortfolioItem = {
  id: 'akeluwa-toolbox', slug: 'akeluwa-toolbox', title: 'AkeluwaToolBox',
  summary: 'Free PDF and photo tools. Compress, edit, convert and merge files, extract PDF pages, and remove image backgrounds in your browser.',
  technologies: 'JavaScript / PDF.js / pdf-lib', project_url: '/akeluwatoolbox/',
  position: 0, active: true, created_at: '', updated_at: '',
};

export const publicInfoHubProject: PortfolioItem = {
  id: 'akeluwa-public-info-hub', slug: 'akeluwa-public-info-hub', title: 'AKELUWA PublicInfoHub',
  summary: 'A simple public-information directory prototype for discovering Nepal government services and official department websites.',
  technologies: 'HTML / CSS / JavaScript', project_url: '/publicinfohub/',
  position: 1, active: true, created_at: '', updated_at: '',
};

export function withToolbox(items: PortfolioItem[]): PortfolioItem[] {
  return [toolboxProject, publicInfoHubProject, ...items.filter(item =>
    ![toolboxProject.slug, publicInfoHubProject.slug].includes(item.slug)
    && !['akeluwatoolbox', 'akeluwapublicinfohub'].includes(item.title.toLowerCase().replace(/[^a-z0-9]/g, ''))
    && !/^\/(?:akeluwatoolbox|publicinfohub)(?:\/|$)/.test(item.project_url || '')
  )];
}
