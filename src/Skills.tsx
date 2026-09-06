import { skillGroups } from './content'
import './skills.css'

export function Skills() {
  return <section className="skills section-shell" id="skills" data-section data-slide="Tools I reach for" aria-labelledby="skills-title">
    <div className="section-heading">
      <div><span className="eyebrow">TOOLS I REACH FOR</span><h2 id="skills-title">New tools.<br /><em>More possibilities.</em></h2></div>
      <p>I pick up the tools and languages the work calls for. Across mobile, cloud, connected devices, and AI, I keep learning—and put each new skill to work.</p>
    </div>
    <div className="skills-grid">
      {skillGroups.map((group, index) => <article className="skill-group" key={group.title}>
        <span className="mini-label" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <h3>{group.title}</h3>
        <ul>{group.skills.map(skill => <li key={skill}>{skill}</li>)}</ul>
      </article>)}
    </div>
  </section>
}
