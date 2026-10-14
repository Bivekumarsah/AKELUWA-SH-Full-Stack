export function TechnologyList({ value, label = "Technologies" }: { value: string; label?: string }) {
  const technologies = value.split(/\s*\/\s*|,\s*|\s*\|\s*/).map((technology) => technology.trim()).filter(Boolean);
  if (!technologies.length) return null;
  return <ul className="project-technologies" aria-label={label}>{technologies.map((technology, index) => <li key={`${technology}-${index}`}>{technology}</li>)}</ul>;
}
