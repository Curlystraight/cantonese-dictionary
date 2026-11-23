import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css';
import { useAuth } from './AuthContext'
import Login from './Login'

const starterEntries = [
  { id: 1, jyutping: 'nei5 hou2', english: 'Hello', type: 'phrase', category: 'Greetings' },
  { id: 2, jyutping: 'ngo5 jiu3', english: 'I want', type: 'phrase', category: 'Everyday' },
  { id: 3, jyutping: 'ngo5 m4 zi1', english: "I don't know", type: 'phrase', category: 'Everyday' },
  { id: 4, jyutping: 'hou2 sik6', english: 'Delicious', type: 'phrase', category: 'Food' },
  { id: 5, jyutping: 'm4 goi1', english: 'Please / Thank you for your help', type: 'phrase', category: 'Everyday' },
  { id: 6, jyutping: 'do1 ze6', english: 'Thank you for a gift or thoughtful gesture', type: 'phrase', category: 'Greetings' },
  { id: 7, jyutping: 'me1', english: 'What', type: 'word', category: 'Questions' },
  { id: 8, jyutping: 'bin1 dou6', english: 'Where', type: 'word', category: 'Questions' },
  { id: 9, jyutping: 'tim4', english: 'Sweet', type: 'word', category: 'Food' },
  { id: 10, jyutping: 'gui6', english: 'Tired', type: 'word', category: 'Everyday' },
  { id: 11, jyutping: 'ngo5 ming4 baak6', english: 'I understand', type: 'phrase', category: 'Conversation' },
  { id: 12, jyutping: 'zoi3 gong2 jat1 ci3', english: 'Say it again', type: 'phrase', category: 'Conversation' },
];

function normaliseSearch(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normaliseJyutping(value, ignoreTones = false) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ignoreTones ? cleaned.replace(/[1-6]/g, '') : cleaned;
}

function App() {
  
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activePage, setActivePage] = useState('Dictionary');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJyutping, setNewJyutping] = useState('');
  const [newEnglish, setNewEnglish] = useState('');
  const [newType, setNewType] = useState('word');
  const [newCategory, setNewCategory] = useState('Everyday');
  
  const filteredEntries = useMemo(() => {
  const query = normaliseSearch(search);
  const hasToneNumbers = /[1-6]/.test(search);

  const jyutpingQuery = normaliseJyutping(search, !hasToneNumbers);
  
  return entries.filter((entry) => {
    const matchesType = filter === 'all' || entry.type === filter;

    const matchesJyutping =
      !query ||
      normaliseJyutping(entry.jyutping, !hasToneNumbers).includes(jyutpingQuery);

    const matchesEnglish =
      !query ||
      normaliseSearch(entry.english).includes(query) ||
      normaliseSearch(entry.category).includes(query);

    return matchesType && (matchesJyutping || matchesEnglish);
  });
}, [entries, search, filter]);
  const { user, loading, signOut } = useAuth()
  const hasLoadedRef = useRef(false)
  useEffect(() => {
  if (!user || hasLoadedRef.current) return

  hasLoadedRef.current = true

  async function loadEntries() {
    const { data: existingEntries, error: loadError } = await supabase
      .from('entries')
      .select('id, jyutping, english_meaning, entry_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error('Error loading vocabulary:', loadError)
      return
    }

    let databaseEntries = existingEntries

    // Import starter vocabulary only if the database is empty
    if (databaseEntries.length === 0) {
      const starterData = starterEntries.map((entry) => ({
        user_id: user.id,
        jyutping: entry.jyutping,
        english_meaning: entry.english,
        entry_type: entry.type,
      }))

      const { data: importedEntries, error: importError } = await supabase
        .from('entries')
        .insert(starterData)
        .select('id, jyutping, english_meaning, entry_type')

      if (importError) {
        console.error('Error importing starter vocabulary:', importError)
        return
      }

      databaseEntries = importedEntries
    }

    const formattedEntries = databaseEntries.map((entry) => ({
      id: entry.id,
      jyutping: entry.jyutping,
      english: entry.english_meaning,
      type: entry.entry_type,
      category: 'Uncategorised',
    }))

    setEntries(formattedEntries)
  }

  loadEntries()
}, [user])

if (loading) {
  return <div>Loading...</div>
}

if (!user) {
  return <Login />
}
  async function addEntry(event) {
  event.preventDefault()

  if (!newJyutping.trim() || !newEnglish.trim()) return

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: user.id,
      jyutping: newJyutping.trim(),
      english_meaning: newEnglish.trim(),
      entry_type: newType,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving entry:', error)
    alert('Could not save entry: ' + error.message)
    return
  }

  const entry = {
    id: data.id,
    jyutping: data.jyutping,
    english: data.english_meaning,
    type: data.entry_type,
    category: 'Uncategorised',
  }

  setEntries((current) => [entry, ...current])
  setNewJyutping('')
  setNewEnglish('')
  setShowAddForm(false)
  setFilter('all')
  setSearch('')
}

  const wordCount = entries.filter((entry) => entry.type === 'word').length;
  const phraseCount = entries.filter((entry) => entry.type === 'phrase').length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">文</div>
          <div>
            <div className="brand-name">Canto<span>Lab</span></div>
            <div className="brand-caption">PERSONAL LEARNING SPACE</div>
          </div>
        </div>

        <div className="nav-section-label">WORKSPACE</div>
        <nav className="navigation">
          {[
            { name: 'Dictionary', icon: '▤' },
            { name: 'Flashcards', icon: '▣' },
            { name: 'Progress', icon: '▥' },
          ].map((item) => (
            <button
              key={item.name}
              className={`nav-item ${activePage === item.name ? 'active' : ''}`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
              {item.name === 'Dictionary' && (
                <span className="nav-count">{entries.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-dot" />
            <span>Personal dictionary</span>
          </div>
            <button
              className="nav-item"
              onClick={signOut}
            >
              <span className="nav-icon">↪</span>
              Sign out
            </button>
          <div className="sidebar-version">CANTOLAB · VERSION 0.1</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activePage}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection-indicator">
              <span className="status-dot" /> Local preview
            </span>
            <div className="avatar">J</div>
          </div>
        </header>

        <div className="page-content">
          {activePage === 'Dictionary' ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR LANGUAGE LIBRARY</div>
                  <h1>Dictionary</h1>
                  <p className="page-description">
                    Your personal collection of Cantonese words and phrases.
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <span>＋</span> Add vocabulary
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total entries</span>
                    <span className="stat-icon blue">▤</span>
                  </div>
                  <div className="stat-number">{entries.length}</div>
                  <div className="stat-foot">Saved vocabulary items</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Words</span>
                    <span className="stat-icon purple">Aa</span>
                  </div>
                  <div className="stat-number">{wordCount}</div>
                  <div className="stat-foot">Individual vocabulary items</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Phrases</span>
                    <span className="stat-icon teal">≡</span>
                  </div>
                  <div className="stat-number">{phraseCount}</div>
                  <div className="stat-foot">Expressions and sentences</div>
                </div>
              </div>

              {showAddForm && (
                <section className="add-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Add vocabulary</h2>
                      <p>Save a new Cantonese word or phrase.</p>
                    </div>
                    <button
                      className="close-button"
                      onClick={() => setShowAddForm(false)}
                      aria-label="Close form"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={addEntry}>
                    <div className="form-grid">
                      <label>
                        Jyutping <span className="required">*</span>
                        <input
                          value={newJyutping}
                          onChange={(e) => setNewJyutping(e.target.value)}
                          placeholder="e.g. nei5 hou2"
                          required
                        />
                      </label>
                      <label>
                        English meaning <span className="required">*</span>
                        <input
                          value={newEnglish}
                          onChange={(e) => setNewEnglish(e.target.value)}
                          placeholder="e.g. Hello"
                          required
                        />
                      </label>
                      <label>
                        Entry type
                        <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                          <option value="word">Word</option>
                          <option value="phrase">Phrase / sentence</option>
                        </select>
                      </label>
                      <label>
                        Category
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                        >
                          {['Everyday', 'Greetings', 'Food', 'Questions', 'Conversation', 'Family', 'Other'].map((category) => (
                            <option key={category}>{category}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="secondary-button" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="primary-button">Save entry</button>
                    </div>
                  </form>
                </section>
              )}

              <section className="dictionary-section">
                <div className="section-heading">
                  <div>
                    <h2>All vocabulary</h2>
                    <p>Search and explore your saved entries.</p>
                  </div>
                  <span className="result-count">{filteredEntries.length} results</span>
                </div>

                <div className="search-box">
                  <span className="search-icon">⌕</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search English or Jyutping..."
                    aria-label="Search dictionary"
                  />
                  {search && (
                    <button className="clear-search" onClick={() => setSearch('')} aria-label="Clear search">
                      ×
                    </button>
                  )}
                  <kbd>SEARCH</kbd>
                </div>
                <div className="search-hint">
                  Tone numbers are optional. Try searching <strong>hou</strong> instead of <strong>hou2</strong>.
                </div>

                <div className="filter-row">
                  <div className="filter-tabs">
                    {[
                      { value: 'all', label: 'All entries' },
                      { value: 'word', label: 'Words' },
                      { value: 'phrase', label: 'Phrases' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        className={`filter-tab ${filter === item.value ? 'selected' : ''}`}
                        onClick={() => setFilter(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="vocabulary-table">
                    <thead>
                      <tr>
                        <th>CANTONESE · JYUTPING</th>
                        <th>ENGLISH MEANING</th>
                        <th>TYPE</th>
                        <th>CATEGORY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <span className="jyutping">{entry.jyutping}</span>
                          </td>
                          <td className="english-cell">{entry.english}</td>
                          <td>
                            <span className={`type-badge ${entry.type}`}>
                              {entry.type}
                            </span>
                          </td>
                          <td><span className="category-text">{entry.category}</span></td>
                        </tr>
                      ))}
                      {filteredEntries.length === 0 && (
                        <tr>
                          <td colSpan="4" className="empty-state">
                            <div className="empty-icon">⌕</div>
                            <strong>No matching entries</strong>
                            <span>Try another search or add a new vocabulary item.</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="coming-soon">
              <div className="coming-icon">{activePage === 'Flashcards' ? '▣' : '▥'}</div>
              <div className="eyebrow">COMING NEXT</div>
              <h1>{activePage}</h1>
              <p>
                We're building this part of your learning workspace next.
                Your dictionary is the first step.
              </p>
              <button className="secondary-button" onClick={() => setActivePage('Dictionary')}>
                Back to dictionary
              </button>
            </div>
          )}

          <footer className="page-footer">
            <span>CantoLab · Your personal Cantonese learning space</span>
            <span>Jyutping · English</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;