import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css';
import { useAuth } from './AuthContext'
import Login from './Login'
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import VocabularyForm from './VocabularyForm'

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
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activePage, setActivePage] = useState('Dictionary');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [newJyutping, setNewJyutping] = useState('');
  const [newEnglish, setNewEnglish] = useState('');
  const [newType, setNewType] = useState('word');
  const [newCategories, setNewCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryError, setCategoryError] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [referenceResults, setReferenceResults] = useState([]);
  const [isSearchingReference, setIsSearchingReference] = useState(false);
  const [referenceSearchError, setReferenceSearchError] = useState('');

  const filteredEntries = useMemo(() => {
    const query = normaliseSearch(search);
    const hasToneNumbers = /[1-6]/.test(search);
    const jyutpingQuery = normaliseJyutping(search, !hasToneNumbers);

    const results = entries.filter((entry) => {
      const matchesType =
        filter === 'all' || entry.type === filter;

      const matchesCategory =
        categoryFilter.length === 0 ||
        categoryFilter.some((category) =>
          (entry.categories || []).includes(category)
        );

      const matchesJyutping =
        !query ||
        normaliseJyutping(entry.jyutping, !hasToneNumbers)
          .includes(jyutpingQuery);

      const matchesEnglish =
        !query ||
        normaliseSearch(entry.english).includes(query) ||
        (entry.categories || []).some((category) =>
          normaliseSearch(category).includes(query)
        );

      return (
        matchesType &&
        matchesCategory &&
        (matchesJyutping || matchesEnglish)
      );
    });

    switch (sortBy) {
      case 'jyutping-asc':
        return results.sort((a, b) =>
          a.jyutping.localeCompare(b.jyutping)
        );

      case 'english-asc':
        return results.sort((a, b) =>
          a.english.localeCompare(b.english)
        );

      case 'oldest':
        return results.reverse();

      case 'newest':
      default:
        return results;
    }
  }, [entries, search, filter, categoryFilter, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEntries.length / pageSize)
  );

  const activePageNumber = Math.min(currentPage, totalPages);

  const paginatedEntries = useMemo(() => {
    const startIndex = (activePageNumber - 1) * pageSize;

    return filteredEntries.slice(
      startIndex,
      startIndex + pageSize
    );
  }, [filteredEntries, activePageNumber, pageSize]);

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


      const { data: categoryLinks, error: linksError } = await supabase
        .from('entry_categories')
        .select('entry_id, category_id')
        .eq('user_id', user.id)

      if (linksError) {
        console.error('Error loading category links:', linksError)
        return
      }

      const { data: categoryRows, error: categoryError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)

      if (categoryError) {
        console.error('Error loading category names:', categoryError)
        return
      }

      const categoryNamesById = Object.fromEntries(
        categoryRows.map((category) => [category.id, category.name])
      )

      const categoriesByEntry = {}

      categoryLinks.forEach((link) => {
        if (!categoriesByEntry[link.entry_id]) {
          categoriesByEntry[link.entry_id] = []
        }

        const categoryName = categoryNamesById[link.category_id]

        if (categoryName) {
          categoriesByEntry[link.entry_id].push(categoryName)
        }
      })

      const formattedEntries = databaseEntries.map((entry) => ({
        id: entry.id,
        jyutping: entry.jyutping,
        english: entry.english_meaning,
        type: entry.entry_type,
        categories: categoriesByEntry[entry.id] || [],
      }))

      setEntries(formattedEntries)

    }

    loadEntries()
  }, [user])

  useEffect(() => {
    if (!user) return

    async function loadCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Error loading categories:', error)
        return
      }

      setCategories(data)
    }

    loadCategories()
  }, [user])

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target)
      ) {
        setShowCategoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, categoryFilter, sortBy, pageSize]);

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Login />
  }

  async function searchReference(field) {
    const query = field === 'english'
      ? newEnglish.trim()
      : newJyutping.trim();

    if (!query) return;

    setIsSearchingReference(true);
    setReferenceSearchError('');
    setReferenceResults([]);

    const { data, error } = await supabase
      .rpc('search_dictionary', {
        search_term: query,
        search_field: field
      });

    if (error) {
      setReferenceSearchError(error.message);
    } else {
      setReferenceResults(data || []);
    }

    setIsSearchingReference(false);
  }

  async function saveCategory(event) {
    event.preventDefault()

    const name = newCategoryName.trim()
    setCategoryError('')

    if (!name || isSavingCategory) return

    const duplicate = categories.some(
      (category) =>
        category.id !== editingCategoryId &&
        category.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicate) {
      setCategoryError('This category already exists.')
      return
    }

    setIsSavingCategory(true)

    const isEditing = editingCategoryId !== null

    const oldCategory = categories.find(
      (category) => category.id === editingCategoryId
    )

    const { data, error } = isEditing
      ? await supabase
        .from('categories')
        .update({ name })
        .eq('id', editingCategoryId)
        .eq('user_id', user.id)
        .select('id, name')
        .single()
      : await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name,
        })
        .select('id, name')
        .single()

    setIsSavingCategory(false)

    if (error) {
      setCategoryError(error.message)
      return
    }

    setCategories((current) => {
      const updated = isEditing
        ? current.map((category) =>
          category.id === data.id ? data : category
        )
        : [...current, data]

      return updated.sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    })

    // Reflect renamed categories in existing vocabulary
    if (isEditing && oldCategory) {
      setEntries((current) =>
        current.map((entry) => ({
          ...entry,
          categories: (entry.categories || []).map((category) =>
            category === oldCategory.name ? name : category
          ),
        }))
      )

      setCategoryFilter((current) =>
        current.map((category) =>
          category === oldCategory.name ? name : category
        )
      )
    }

    resetCategoryForm()
  }

  async function deleteCategory(category) {
    const entryCount = entries.filter((entry) =>
      entry.categories?.includes(category.name)
    ).length

    const confirmed = window.confirm(
      `Delete "${category.name}"?\n\n` +
      `This will remove the category from ${entryCount} vocabulary entries. ` +
      `The vocabulary itself will not be deleted.`
    )

    if (!confirmed) return

    setCategoryError('')

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
      .eq('user_id', user.id)

    if (error) {
      setCategoryError(error.message)
      return
    }

    setCategories((current) =>
      current.filter((item) => item.id !== category.id)
    )

    // Remove the deleted tag from displayed vocabulary
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        categories: (entry.categories || []).filter(
          (name) => name !== category.name
        ),
      }))
    )

    setCategoryFilter((current) =>
      current.filter((name) => name !== category.name)
    )

    setNewCategories((current) =>
      current.filter((id) => id !== category.id)
    )

    if (editingCategoryId === category.id) {
      resetCategoryForm()
    }
  }

  function editCategory(category) {
    setEditingCategoryId(category.id)
    setNewCategoryName(category.name)
    setCategoryError('')
  }

  function resetCategoryForm() {
    setEditingCategoryId(null)
    setNewCategoryName('')
    setCategoryError('')
  }

  function closeEntryForm() {
    setEditingEntryId(null)
    setNewJyutping('')
    setNewEnglish('')
    setNewType('word')
    setNewCategories([])
    setReferenceResults([])
    setReferenceSearchError('')
    setShowAddForm(false)
    setShowCategoryDropdown(false)
  }

  function editEntry(entry) {
    setEditingEntryId(entry.id);
    setNewJyutping(entry.jyutping);
    setNewEnglish(entry.english);
    setNewType(entry.type);

    setNewCategories(
      categories
        .filter((category) =>
          entry.categories?.includes(category.name)
        )
        .map((category) => category.id)
    );

    setReferenceResults([]);
    setReferenceSearchError('');
    setShowAddForm(true);
    setShowCategoryDropdown(false)
  }

  async function deleteEntry(entry) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${entry.jyutping} - ${entry.english}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entry.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEntries((previous) =>
      previous.filter((item) => item.id !== entry.id)
    );
  }
  async function addEntry(event) {
    event.preventDefault()

    if (!newJyutping.trim() || !newEnglish.trim()) return

    // Check for duplicate vocabulary
    const duplicate = entries.find((entry) =>
      entry.id !== editingEntryId &&
      normaliseJyutping(entry.jyutping, false) ===
      normaliseJyutping(newJyutping, false) &&
      normaliseSearch(entry.english) ===
      normaliseSearch(newEnglish)
    )

    if (duplicate) {
      alert(
        `This entry already exists in your dictionary:\n\n${duplicate.jyutping} — ${duplicate.english}`
      )
      return
    }

    const isEditing = editingEntryId !== null

    const entryValues = {
      user_id: user.id,
      jyutping: newJyutping.trim(),
      english_meaning: newEnglish.trim(),
      entry_type: newType,
    }

    // Insert or update the entry
    const { data, error } = isEditing
      ? await supabase
        .from('entries')
        .update(entryValues)
        .eq('id', editingEntryId)
        .eq('user_id', user.id)
        .select()
        .single()
      : await supabase
        .from('entries')
        .insert(entryValues)
        .select()
        .single()

    if (error) {
      console.error('Error saving entry:', error)
      alert('Could not save entry: ' + error.message)
      return
    }

    // Load existing category links when editing
    let existingCategoryIds = []

    if (isEditing) {
      const { data: existingLinks, error: linksError } = await supabase
        .from('entry_categories')
        .select('category_id')
        .eq('entry_id', data.id)
        .eq('user_id', user.id)

      if (linksError) {
        alert('Entry saved, but could not load categories: ' + linksError.message)
        return
      }

      existingCategoryIds = existingLinks.map(
        (link) => link.category_id
      )
    }

    // Identify which categories need adding or removing
    const categoriesToAdd = newCategories.filter(
      (id) => !existingCategoryIds.includes(id)
    )

    const categoriesToRemove = existingCategoryIds.filter(
      (id) => !newCategories.includes(id)
    )

    // Add new category links
    if (categoriesToAdd.length > 0) {
      const { error: categoryError } = await supabase
        .from('entry_categories')
        .insert(
          categoriesToAdd.map((categoryId) => ({
            user_id: user.id,
            entry_id: data.id,
            category_id: categoryId,
          }))
        )

      if (categoryError) {
        if (!isEditing) {
          await supabase
            .from('entries')
            .delete()
            .eq('id', data.id)
            .eq('user_id', user.id)
        }

        alert('Could not save categories: ' + categoryError.message)
        return
      }
    }

    // Remove deselected category links
    if (categoriesToRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('entry_categories')
        .delete()
        .eq('entry_id', data.id)
        .eq('user_id', user.id)
        .in('category_id', categoriesToRemove)

      if (removeError) {
        alert('Could not remove categories: ' + removeError.message)
        return
      }
    }

    // Prepare the updated entry for display
    const selectedCategoryNames = categories
      .filter((category) => newCategories.includes(category.id))
      .map((category) => category.name)

    const entry = {
      id: data.id,
      jyutping: data.jyutping,
      english: data.english_meaning,
      type: data.entry_type,
      categories: selectedCategoryNames,
    }

    // Update the local dictionary
    if (isEditing) {
      setEntries((current) =>
        current.map((item) =>
          item.id === entry.id ? entry : item
        )
      )
    } else {
      setEntries((current) => [entry, ...current])
    }

    // Reset the form
    setEditingEntryId(null)
    setNewJyutping('')
    setNewEnglish('')
    setNewCategories([])
    setNewType('word')
    setReferenceResults([])
    setReferenceSearchError('')
    setShowAddForm(false)
    setShowCategoryDropdown(false)
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
            { name: 'Categories', icon: '▤' },
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
                  onClick={() => {
                    closeEntryForm()
                    setShowAddForm(true)
                  }}
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
                <VocabularyForm
                  editingEntryId={editingEntryId}
                  newJyutping={newJyutping}
                  setNewJyutping={setNewJyutping}
                  newEnglish={newEnglish}
                  setNewEnglish={setNewEnglish}
                  newType={newType}
                  setNewType={setNewType}
                  newCategories={newCategories}
                  setNewCategories={setNewCategories}
                  categories={categories}
                  showCategoryDropdown={showCategoryDropdown}
                  setShowCategoryDropdown={setShowCategoryDropdown}
                  categoryDropdownRef={categoryDropdownRef}
                  searchReference={searchReference}
                  isSearchingReference={isSearchingReference}
                  referenceSearchError={referenceSearchError}
                  referenceResults={referenceResults}
                  setReferenceResults={setReferenceResults}
                  addEntry={addEntry}
                  closeEntryForm={closeEntryForm}
                />
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
                        type="button"
                        className={`filter-tab ${filter === item.value ? 'selected' : ''}`}
                        onClick={() => setFilter(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="dictionary-filter-controls">

                    {/* Category filter */}
                    <div className="category-dropdown" ref={filterDropdownRef}>
                      <button
                        type="button"
                        className="category-dropdown-trigger"
                        onClick={() => setShowFilterDropdown((current) => !current)}
                        aria-expanded={showFilterDropdown}
                      >
                        <span>
                          {categoryFilter.length === 0
                            ? 'All categories'
                            : `${categoryFilter.length} selected`}
                        </span>

                        <span className="category-chevron">
                          {showFilterDropdown ? '▴' : '▾'}
                        </span>
                      </button>

                      {showFilterDropdown && (
                        <div className="category-dropdown-menu">
                          {categories.map((category) => (
                            <label
                              key={category.id}
                              className="category-dropdown-option"
                            >
                              <input
                                type="checkbox"
                                checked={categoryFilter.includes(category.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCategoryFilter((current) => [
                                      ...current,
                                      category.name,
                                    ])
                                  } else {
                                    setCategoryFilter((current) =>
                                      current.filter(
                                        (name) => name !== category.name
                                      )
                                    )
                                  }
                                }}
                              />
                              <span>{category.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sorting */}
                    <select
                      className="dictionary-sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      aria-label="Sort dictionary"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="jyutping-asc">Jyutping A–Z</option>
                      <option value="english-asc">English A–Z</option>
                    </select>

                    {/* Reset filters */}
                    <button
                      type="button"
                      className="clear-filters-button"
                      onClick={() => {
                        setSearch('')
                        setFilter('all')
                        setCategoryFilter([])
                        setSortBy('newest')
                        setShowFilterDropdown(false)
                        setCurrentPage(1)
                      }}
                    >
                      Clear filters
                    </button>

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
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEntries.map((entry) => (
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
                          <td>
                            <div className="entry-category-list">
                              {entry.categories?.length > 0
                                ? entry.categories.map((category) => (
                                  <span key={category} className="category-text">
                                    {category}
                                  </span>
                                ))
                                : <span className="category-text">Uncategorised</span>
                              }
                            </div>
                          </td>
                          <td>
                            <div className="entry-actions">
                              <button
                                type="button"
                                className="action-button edit-button"
                                onClick={() => editEntry(entry)}
                                title="Edit entry"
                                aria-label="Edit entry"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="action-button delete-button"
                                onClick={() => deleteEntry(entry)}
                                title="Delete entry"
                                aria-label="Delete entry"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredEntries.length === 0 && (
                        <tr>
                          <td colSpan="5" className="empty-state">
                            <div className="empty-icon">⌕</div>
                            <strong>No matching entries</strong>
                            <span>Try another search or add a new vocabulary item.</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile vocabulary cards */}
                <div className="mobile-vocabulary-list">
                  {paginatedEntries.map((entry) => (
                    <div key={entry.id} className="mobile-vocabulary-card">

                      <div className="mobile-card-top">
                        <div className="mobile-card-content">
                          <span className="jyutping">
                            {entry.jyutping}
                          </span>

                          <div className="mobile-english">
                            {entry.english}
                          </div>
                        </div>

                        <div className="entry-actions">
                          <button
                            type="button"
                            className="action-button edit-button"
                            onClick={() => editEntry(entry)}
                            title="Edit entry"
                            aria-label="Edit entry"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            className="action-button delete-button"
                            onClick={() => deleteEntry(entry)}
                            title="Delete entry"
                            aria-label="Delete entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="mobile-card-tags">
                        <span className={`type-badge ${entry.type}`}>
                          {entry.type}
                        </span>

                        <div className="entry-category-list">
                          {entry.categories?.length > 0
                            ? entry.categories.map((category) => (
                              <span key={category} className="category-text">
                                {category}
                              </span>
                            ))
                            : <span className="category-text">Uncategorised</span>
                          }
                        </div>
                      </div>

                    </div>
                  ))}

                  {filteredEntries.length === 0 && (
                    <div className="mobile-empty-state">
                      <div className="empty-icon">⌕</div>
                      <strong>No matching entries</strong>
                      <span>Try another search or add a new vocabulary item.</span>
                    </div>
                  )}
                </div>

                <div className="dictionary-pagination">

                  <div className="pagination-info">
                    Showing{' '}
                    {filteredEntries.length === 0
                      ? 0
                      : (activePageNumber - 1) * pageSize + 1}
                    –
                    {Math.min(
                      activePageNumber * pageSize,
                      filteredEntries.length
                    )}{' '}
                    of {filteredEntries.length} entries
                  </div>

                  <div className="pagination-controls">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={activePageNumber === 1}
                      aria-label="First page"
                    >
                      <ChevronsLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(activePageNumber - 1)}
                      disabled={activePageNumber === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span className="pagination-page">
                      {activePageNumber} / {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(activePageNumber + 1)}
                      disabled={activePageNumber === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={activePageNumber === totalPages}
                      aria-label="Last page"
                    >
                      <ChevronsRight size={18} />
                    </button>
                  </div>

                  <div className="pagination-size">
                    <label htmlFor="page-size">Rows per page</label>
                    <select
                      id="page-size"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </section>
            </>
          ) : activePage === 'Categories' ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ORGANISE YOUR VOCABULARY</div>
                  <h1>Categories</h1>
                  <p className="page-description">
                    Create and manage your vocabulary categories.
                  </p>
                </div>
              </div>

              <section className="add-panel">
                <div className="section-heading">
                  <div>
                    <h2>
                      {editingCategoryId ? 'Edit category' : 'Add category'}
                    </h2>
                    <p>Give your vocabulary a little structure.</p>
                  </div>
                </div>

                <form onSubmit={saveCategory} className="category-management-form">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Travel"
                    aria-label="Category name"
                    maxLength={50}
                    required
                  />

                  {editingCategoryId && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetCategoryForm}
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isSavingCategory || !newCategoryName.trim()}
                  >
                    {isSavingCategory
                      ? 'Saving...'
                      : editingCategoryId
                        ? 'Save changes'
                        : 'Add category'}
                  </button>
                </form>

                {categoryError && (
                  <p className="category-error" role="alert">
                    {categoryError}
                  </p>
                )}
              </section>

              <section className="dictionary-section">
                <div className="section-heading">
                  <div>
                    <h2>Your categories</h2>
                    <p>Manage your existing vocabulary tags.</p>
                  </div>

                  <span className="result-count">
                    {categories.length} categories
                  </span>
                </div>

                <div className="category-management-list">
                  {categories.map((category) => {
                    const entryCount = entries.filter((entry) =>
                      entry.categories?.includes(category.name)
                    ).length

                    return (
                      <div
                        key={category.id}
                        className="category-management-row"
                      >
                        <div className="category-management-info">
                          <span className="category-management-name">
                            {category.name}
                          </span>

                          <span className="category-management-count">
                            {entryCount} vocabulary {entryCount === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>

                        <div className="entry-actions">
                          <button
                            type="button"
                            className="action-button edit-button"
                            onClick={() => editCategory(category)}
                            title="Rename category"
                            aria-label={`Rename ${category.name}`}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            className="action-button delete-button"
                            onClick={() => deleteCategory(category)}
                            title="Delete category"
                            aria-label={`Delete ${category.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {categories.length === 0 && (
                    <div className="mobile-empty-state">
                      <strong>No categories yet</strong>
                      <span>Add your first category above.</span>
                    </div>
                  )}
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
      </main >
    </div >
  );
}

export default App;