import { useEffect, useRef } from 'react'

export default function VocabularyForm({
    editingEntryId,
    newJyutping,
    setNewJyutping,
    newEnglish,
    setNewEnglish,
    newType,
    setNewType,
    newCategories,
    setNewCategories,
    categories,
    showCategoryDropdown,
    setShowCategoryDropdown,
    categoryDropdownRef,
    searchReference,
    isSearchingReference,
    referenceSearchError,
    referenceResults,
    setReferenceResults,
    addEntry,
    closeEntryForm,
}) {
    const dialogRef = useRef(null)

    useEffect(() => {
        const dialog = dialogRef.current
        const previousOverflow = document.body.style.overflow

        dialog.showModal()
        document.body.style.overflow = 'hidden'

        return () => {
            dialog.close()
            document.body.style.overflow = previousOverflow
        }
    }, [])

    return (
        <dialog
            ref={dialogRef}
            className="vocabulary-modal"
            aria-labelledby="vocabulary-modal-title"
            onCancel={(event) => {
                event.preventDefault()
                closeEntryForm()
            }}
        >
            <section className="add-panel">

                <div className="section-heading">
                    <div>
                        <h2 id="vocabulary-modal-title">
                            {editingEntryId ? 'Edit vocabulary' : 'Add vocabulary'}
                        </h2>

                        <p>
                            {editingEntryId
                                ? 'Update your existing vocabulary entry.'
                                : 'Save a new Cantonese word or phrase.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="close-button"
                        onClick={closeEntryForm}
                        aria-label="Close form"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={addEntry}>
                    <div className="form-grid">

                        {/* Jyutping input */}
                        <label>
                            Jyutping <span className="required">*</span>

                            <input
                                value={newJyutping}
                                onChange={(e) => setNewJyutping(e.target.value)}
                                placeholder="e.g. nei5 hou2"
                                required
                            />

                            <button
                                type="button"
                                className="lookup-button"
                                onClick={() => searchReference('jyutping')}
                                disabled={isSearchingReference || !newJyutping.trim()}
                            >
                                Find English
                            </button>
                        </label>

                        {/* English input */}
                        <label>
                            English meaning <span className="required">*</span>

                            <input
                                value={newEnglish}
                                onChange={(e) => setNewEnglish(e.target.value)}
                                placeholder="e.g. Hello"
                                required
                            />

                            <button
                                type="button"
                                className="lookup-button"
                                onClick={() => searchReference('english')}
                                disabled={isSearchingReference || !newEnglish.trim()}
                            >
                                Find Jyutping
                            </button>
                        </label>

                        {/* Dictionary lookup results */}
                        {(isSearchingReference ||
                            referenceSearchError ||
                            referenceResults.length > 0) && (
                                <div className="reference-section">

                                    {isSearchingReference && (
                                        <p>Searching dictionary...</p>
                                    )}

                                    {referenceSearchError && (
                                        <p>{referenceSearchError}</p>
                                    )}

                                    {referenceResults.length > 0 && (
                                        <div className="reference-results">
                                            <h4>
                                                Dictionary suggestions ({referenceResults.length})
                                            </h4>

                                            {referenceResults.map((result) => (
                                                <button
                                                    key={result.id}
                                                    type="button"
                                                    className="reference-result"
                                                    onClick={() => {
                                                        setNewJyutping(result.jyutping)
                                                        setNewEnglish(result.english)
                                                        setReferenceResults([])
                                                    }}
                                                >
                                                    <strong>{result.jyutping}</strong>
                                                    <span>{result.english}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                </div>
                            )}

                        {/* Entry type selector */}
                        <div className="form-field">
                            <label>Entry type</label>

                            <div className="type-selector">
                                {[
                                    { value: 'word', label: 'Word' },
                                    { value: 'phrase', label: 'Phrase / sentence' },
                                ].map((option) => (
                                    <label
                                        key={option.value}
                                        className={`type-option ${newType === option.value ? 'selected' : ''
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="entryType"
                                            value={option.value}
                                            checked={newType === option.value}
                                            onChange={() => setNewType(option.value)}
                                        />

                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Category selection */}
                        <div className="form-field">
                            <label>Categories</label>

                            <div
                                className="category-dropdown"
                                ref={categoryDropdownRef}
                            >
                                <button
                                    type="button"
                                    className="category-dropdown-trigger"
                                    onClick={() =>
                                        setShowCategoryDropdown((current) => !current)
                                    }
                                    aria-expanded={showCategoryDropdown}
                                >
                                    <div className="selected-categories">
                                        {newCategories.length === 0 ? (
                                            <span className="category-placeholder">
                                                Select categories
                                            </span>
                                        ) : (
                                            categories
                                                .filter((category) =>
                                                    newCategories.includes(category.id)
                                                )
                                                .map((category) => (
                                                    <span
                                                        key={category.id}
                                                        className="selected-category-chip"
                                                    >
                                                        {category.name}
                                                    </span>
                                                ))
                                        )}
                                    </div>

                                    <span className="category-chevron">
                                        {showCategoryDropdown ? '▴' : '▾'}
                                    </span>
                                </button>

                                {showCategoryDropdown && (
                                    <div className="category-dropdown-menu">
                                        {categories.map((category) => (
                                            <label
                                                key={category.id}
                                                className="category-dropdown-option"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={newCategories.includes(category.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewCategories((current) => [
                                                                ...current,
                                                                category.id,
                                                            ])
                                                        } else {
                                                            setNewCategories((current) =>
                                                                current.filter(
                                                                    (id) => id !== category.id
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
                        </div>

                        {/* Form actions */}
                        <div className="form-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={closeEntryForm}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="primary-button"
                            >
                                {editingEntryId ? 'Save changes' : 'Add entry'}
                            </button>
                        </div>

                    </div>
                </form>
            </section>
        </dialog>
    )
}