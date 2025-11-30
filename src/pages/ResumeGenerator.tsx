import { useState, useMemo } from 'react'
import {
  personalInfo,
  experiences,
  publications,
  projects,
  education,
  skills,
  speakingEngagements,
  type Experience,
  type Publication,
  type Project
} from '../data/resumeData'
import './ResumeGenerator.css'

type SectionType = 'experience' | 'publications' | 'projects' | 'education' | 'skills' | 'speaking';

interface ResumeConfig {
  includeSummary: boolean;
  customSummary: string;
  selectedExperiences: string[];
  selectedPublications: string[];
  selectedProjects: string[];
  selectedEducation: string[];
  selectedSkillCategories: string[];
  includeSpeaking: boolean;
  sectionOrder: SectionType[];
  accentColor: string;
  fontStyle: 'classic' | 'modern' | 'minimal';
}

const defaultConfig: ResumeConfig = {
  includeSummary: true,
  customSummary: personalInfo.summary,
  selectedExperiences: experiences.map(e => e.id),
  selectedPublications: publications.map(p => p.id),
  selectedProjects: projects.slice(0, 3).map(p => p.id),
  selectedEducation: education.map(e => e.id),
  selectedSkillCategories: skills.map(s => s.category),
  includeSpeaking: true,
  sectionOrder: ['experience', 'publications', 'education', 'skills', 'projects', 'speaking'],
  accentColor: '#1a365d',
  fontStyle: 'modern'
};

const fontStyles = {
  classic: {
    name: 'Classic',
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"Source Serif 4", Georgia, serif'
  },
  modern: {
    name: 'Modern',
    headingFont: '"DM Sans", "Helvetica Neue", sans-serif',
    bodyFont: '"DM Sans", "Helvetica Neue", sans-serif'
  },
  minimal: {
    name: 'Minimal',
    headingFont: '"JetBrains Mono", monospace',
    bodyFont: '"IBM Plex Sans", system-ui, sans-serif'
  }
};

const accentColors = [
  { name: 'Navy', value: '#1a365d' },
  { name: 'Forest', value: '#1e3a2f' },
  { name: 'Burgundy', value: '#722f37' },
  { name: 'Slate', value: '#334155' },
  { name: 'Charcoal', value: '#1f1f1f' },
  { name: 'Teal', value: '#115e59' },
  { name: 'Plum', value: '#581c87' },
  { name: 'Rust', value: '#9a3412' }
];

function ResumeGenerator() {
  const [config, setConfig] = useState<ResumeConfig>(defaultConfig);
  const [jobDescription, setJobDescription] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  const suggestedItems = useMemo(() => {
    if (!jobDescription.trim()) return null;
    
    const lowerDesc = jobDescription.toLowerCase();
    const keywords = lowerDesc.split(/\s+/).filter(w => w.length > 3);
    
    const scoreItem = (tags: string[], highlights?: string[]) => {
      let score = 0;
      tags.forEach(tag => {
        if (lowerDesc.includes(tag.toLowerCase())) score += 2;
      });
      if (highlights) {
        highlights.forEach(h => {
          keywords.forEach(kw => {
            if (h.toLowerCase().includes(kw)) score += 0.5;
          });
        });
      }
      return score;
    };

    return {
      experiences: experiences.filter(e => scoreItem(e.tags, e.highlights) > 0).map(e => e.id),
      publications: publications.filter(p => scoreItem(p.tags) > 0).map(p => p.id),
      projects: projects.filter(p => scoreItem(p.tags) > 0).map(p => p.id)
    };
  }, [jobDescription]);

  const applySuggestions = () => {
    if (suggestedItems) {
      setConfig(prev => ({
        ...prev,
        selectedExperiences: suggestedItems.experiences.length > 0 
          ? suggestedItems.experiences 
          : prev.selectedExperiences,
        selectedPublications: suggestedItems.publications.length > 0 
          ? suggestedItems.publications 
          : prev.selectedPublications,
        selectedProjects: suggestedItems.projects.length > 0 
          ? suggestedItems.projects 
          : prev.selectedProjects
      }));
    }
  };

  const toggleItem = (
    key: 'selectedExperiences' | 'selectedPublications' | 'selectedProjects' | 'selectedEducation' | 'selectedSkillCategories',
    id: string
  ) => {
    setConfig(prev => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter(i => i !== id)
        : [...prev[key], id]
    }));
  };

  const moveSection = (section: SectionType, direction: 'up' | 'down') => {
    const idx = config.sectionOrder.indexOf(section);
    if (direction === 'up' && idx > 0) {
      const newOrder = [...config.sectionOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      setConfig(prev => ({ ...prev, sectionOrder: newOrder }));
    } else if (direction === 'down' && idx < config.sectionOrder.length - 1) {
      const newOrder = [...config.sectionOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      setConfig(prev => ({ ...prev, sectionOrder: newOrder }));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedExps = experiences.filter(e => config.selectedExperiences.includes(e.id));
  const selectedPubs = publications.filter(p => config.selectedPublications.includes(p.id));
  const selectedProjs = projects.filter(p => config.selectedProjects.includes(p.id));
  const selectedEdu = education.filter(e => config.selectedEducation.includes(e.id));
  const selectedSkills = skills.filter(s => config.selectedSkillCategories.includes(s.category));

  const renderSection = (section: SectionType) => {
    switch (section) {
      case 'experience':
        if (selectedExps.length === 0) return null;
        return (
          <section key="experience" className="resume-section">
            <h2>Experience</h2>
            {selectedExps.map((exp: Experience) => (
              <div key={exp.id} className="resume-entry">
                <div className="entry-header">
                  <div className="entry-title">
                    <strong>{exp.role}</strong>
                    <span className="entry-company">{exp.company}</span>
                  </div>
                  <div className="entry-meta">
                    <span>{exp.location}</span>
                    <span>{exp.startDate} – {exp.endDate}</span>
                  </div>
                </div>
                <ul className="entry-highlights">
                  {exp.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );

      case 'publications':
        if (selectedPubs.length === 0) return null;
        return (
          <section key="publications" className="resume-section">
            <h2>Publications</h2>
            {selectedPubs.map((pub: Publication) => (
              <div key={pub.id} className="resume-entry publication-entry">
                <div className="pub-title">
                  <strong>{pub.title}</strong>
                  <span className="pub-venue">{pub.venue}</span>
                </div>
                <p className="pub-description">{pub.description}</p>
              </div>
            ))}
          </section>
        );

      case 'projects':
        if (selectedProjs.length === 0) return null;
        return (
          <section key="projects" className="resume-section">
            <h2>Selected Projects</h2>
            {selectedProjs.map((proj: Project) => (
              <div key={proj.id} className="resume-entry project-entry">
                <div className="project-header">
                  <strong>{proj.title}</strong>
                  <span className="project-year">{proj.year}</span>
                </div>
                <p>{proj.description}</p>
              </div>
            ))}
          </section>
        );

      case 'education':
        if (selectedEdu.length === 0) return null;
        return (
          <section key="education" className="resume-section">
            <h2>Education</h2>
            {selectedEdu.map(edu => (
              <div key={edu.id} className="resume-entry education-entry">
                <div className="entry-header">
                  <div className="entry-title">
                    <strong>{edu.institution}</strong>
                    <span>{edu.degree} in {edu.field}</span>
                  </div>
                  <div className="entry-meta">
                    <span>{edu.location}</span>
                    <span>{edu.year}{edu.honors && ` • ${edu.honors}`}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        );

      case 'skills':
        if (selectedSkills.length === 0) return null;
        return (
          <section key="skills" className="resume-section skills-section">
            <h2>Skills</h2>
            <div className="skills-grid">
              {selectedSkills.map(skill => (
                <div key={skill.category} className="skill-row">
                  <span className="skill-category">{skill.category}:</span>
                  <span className="skill-items">{skill.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'speaking':
        if (!config.includeSpeaking) return null;
        return (
          <section key="speaking" className="resume-section">
            <h2>Speaking</h2>
            <div className="speaking-list">
              {speakingEngagements.map((s, i) => (
                <div key={i} className="speaking-entry">
                  <strong>{s.event}</strong>: {s.topic}
                </div>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="resume-generator">
      <div className="controls-panel no-print">
        <div className="controls-header">
          <h1>Resume Generator</h1>
          <p className="controls-subtitle">Customize your resume for each application</p>
        </div>

        <div className="control-section">
          <h3>📋 Job Description (Optional)</h3>
          <p className="control-hint">Paste a job description to get AI-powered suggestions</p>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here to get recommendations on which items to include..."
            rows={4}
          />
          {suggestedItems && (
            <button className="suggest-btn" onClick={applySuggestions}>
              ✨ Apply Suggestions ({suggestedItems.experiences.length + suggestedItems.publications.length + suggestedItems.projects.length} matches)
            </button>
          )}
        </div>

        <div className="control-section">
          <h3>🎨 Style</h3>
          <div className="style-options">
            <div className="font-selector">
              <label>Font Style</label>
              <div className="font-options">
                {Object.entries(fontStyles).map(([key, style]) => (
                  <button
                    key={key}
                    className={`font-option ${config.fontStyle === key ? 'active' : ''}`}
                    onClick={() => setConfig(prev => ({ ...prev, fontStyle: key as 'classic' | 'modern' | 'minimal' }))}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="color-selector">
              <label>Accent Color</label>
              <div className="color-options">
                {accentColors.map(color => (
                  <button
                    key={color.value}
                    className={`color-option ${config.accentColor === color.value ? 'active' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setConfig(prev => ({ ...prev, accentColor: color.value }))}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="control-section">
          <h3>📝 Summary</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.includeSummary}
              onChange={(e) => setConfig(prev => ({ ...prev, includeSummary: e.target.checked }))}
            />
            Include summary
          </label>
          {config.includeSummary && (
            <textarea
              value={config.customSummary}
              onChange={(e) => setConfig(prev => ({ ...prev, customSummary: e.target.value }))}
              rows={3}
              className="summary-input"
            />
          )}
        </div>

        <div className="control-section">
          <h3>💼 Experience</h3>
          {experiences.map(exp => (
            <label key={exp.id} className={`checkbox-label ${suggestedItems?.experiences.includes(exp.id) ? 'suggested' : ''}`}>
              <input
                type="checkbox"
                checked={config.selectedExperiences.includes(exp.id)}
                onChange={() => toggleItem('selectedExperiences', exp.id)}
              />
              {exp.company} – {exp.role}
              {suggestedItems?.experiences.includes(exp.id) && <span className="match-badge">Match</span>}
            </label>
          ))}
        </div>

        <div className="control-section">
          <h3>📄 Publications</h3>
          {publications.map(pub => (
            <label key={pub.id} className={`checkbox-label ${suggestedItems?.publications.includes(pub.id) ? 'suggested' : ''}`}>
              <input
                type="checkbox"
                checked={config.selectedPublications.includes(pub.id)}
                onChange={() => toggleItem('selectedPublications', pub.id)}
              />
              {pub.title.substring(0, 50)}...
              {suggestedItems?.publications.includes(pub.id) && <span className="match-badge">Match</span>}
            </label>
          ))}
        </div>

        <div className="control-section">
          <h3>🚀 Projects</h3>
          {projects.map(proj => (
            <label key={proj.id} className={`checkbox-label ${suggestedItems?.projects.includes(proj.id) ? 'suggested' : ''}`}>
              <input
                type="checkbox"
                checked={config.selectedProjects.includes(proj.id)}
                onChange={() => toggleItem('selectedProjects', proj.id)}
              />
              {proj.title}
              {suggestedItems?.projects.includes(proj.id) && <span className="match-badge">Match</span>}
            </label>
          ))}
        </div>

        <div className="control-section">
          <h3>🎓 Education</h3>
          {education.map(edu => (
            <label key={edu.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={config.selectedEducation.includes(edu.id)}
                onChange={() => toggleItem('selectedEducation', edu.id)}
              />
              {edu.institution} – {edu.degree}
            </label>
          ))}
        </div>

        <div className="control-section">
          <h3>🛠 Skills</h3>
          {skills.map(skill => (
            <label key={skill.category} className="checkbox-label">
              <input
                type="checkbox"
                checked={config.selectedSkillCategories.includes(skill.category)}
                onChange={() => toggleItem('selectedSkillCategories', skill.category)}
              />
              {skill.category}
            </label>
          ))}
        </div>

        <div className="control-section">
          <h3>🎤 Speaking</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.includeSpeaking}
              onChange={(e) => setConfig(prev => ({ ...prev, includeSpeaking: e.target.checked }))}
            />
            Include speaking engagements
          </label>
        </div>

        <div className="control-section">
          <h3>📑 Section Order</h3>
          <p className="control-hint">Drag to reorder or use arrows</p>
          <div className="section-order">
            {config.sectionOrder.map((section, idx) => (
              <div key={section} className="section-order-item">
                <span className="section-name">{section}</span>
                <div className="order-buttons">
                  <button 
                    onClick={() => moveSection(section, 'up')} 
                    disabled={idx === 0}
                    className="order-btn"
                  >↑</button>
                  <button 
                    onClick={() => moveSection(section, 'down')} 
                    disabled={idx === config.sectionOrder.length - 1}
                    className="order-btn"
                  >↓</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="action-buttons">
          <button className="preview-btn" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? '👁 Hide Preview' : '👁 Show Preview'}
          </button>
          <button className="print-btn" onClick={handlePrint}>
            🖨 Print / Save PDF
          </button>
        </div>
      </div>

      {showPreview && (
        <div 
          className="resume-preview"
          style={{
            '--accent-color': config.accentColor,
            '--heading-font': fontStyles[config.fontStyle].headingFont,
            '--body-font': fontStyles[config.fontStyle].bodyFont,
          } as React.CSSProperties}
        >
          <div className="resume-paper">
            <header className="resume-header">
              <h1>{personalInfo.name}</h1>
              <div className="contact-info">
                <span>{personalInfo.location}</span>
                <span className="separator">•</span>
                <span>{personalInfo.website}</span>
                <span className="separator">•</span>
                <span>{personalInfo.github}</span>
              </div>
            </header>

            {config.includeSummary && (
              <section className="resume-section summary-section">
                <p>{config.customSummary}</p>
              </section>
            )}

            {config.sectionOrder.map(section => renderSection(section))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeGenerator;

