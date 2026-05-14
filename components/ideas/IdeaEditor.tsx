import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  Type, Plus, Trash2, GripVertical, Highlighter,
  ChevronDown, ChevronUp, Save,
  Layout, Sparkles, Check, RotateCw, AlertTriangle, History, X
} from 'lucide-react';
import { motion, Reorder, AnimatePresence, useDragControls } from 'framer-motion';
import styles from './IdeaEditor.module.css';
import { structuredToHtml } from '@/lib/text-parser';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import getGlitch from '@/app/page.module.css';


interface ContentSection {
  id: string;
  title: string;
  paragraphs: string[];
}

interface IdeaEditorProps {
  id: string;
  initialContent?: ContentSection[];
  isSaving?: boolean;
  onSave?: (content: ContentSection[], toCloud?: boolean) => void;
  targetSectionId?: string | null;
  isAuthor?: boolean;
}

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}: {
  isOpen: boolean,
  onClose: () => void,
  onConfirm: () => void,
  title: string,
  message: string
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className={styles.confirmModalInner}>
      <div className={styles.confirmIconBox}>
        <AlertTriangle size={32} />
      </div>
      <p className={styles.confirmMessage}>{message}</p>
      <div className={styles.confirmActions}>
        <button onClick={onClose} className={styles.modalCancelBtn}>CANCEL</button>
        <button onClick={() => { onConfirm(); onClose(); }} className="btnSolid" style={{ padding: '0.6rem 1.5rem', fontSize: '0.8rem' }}>
          PROCEED
        </button>
      </div>
    </div>
  </Modal>
);

const EditableContent = ({
  initialValue,
  onBlur,
  className,
  placeholder
}: {
  initialValue: string,
  onBlur: (val: string) => void,
  className: string,
  placeholder: string
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // We only set the initial value once to avoid React overwriting user input during re-renders
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== initialValue) {
      contentRef.current.innerHTML = initialValue;
    }
  }, []);

  return (
    <div
      ref={contentRef}
      className={className}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onBlur(e.currentTarget.innerHTML)}
      data-placeholder={placeholder}
    />
  );
};

const SectionItem = ({
  section,
  activeSectionId,
  setActiveSectionId,
  updateTitle,
  removeSection,
  updateParagraph,
  removeParagraph,
  addParagraph,
  sectionsLength,
  isAuthor
}: {
  section: ContentSection,
  activeSectionId: string | null,
  setActiveSectionId: (id: string, type: 'title' | 'paragraph') => void,
  updateTitle: (id: string, title: string) => void,
  removeSection: (id: string) => void,
  updateParagraph: (sectionId: string, pIndex: number, content: string) => void,
  removeParagraph: (sectionId: string, pIndex: number) => void,
  addParagraph: (sectionId: string) => void,
  sectionsLength: number,
  isAuthor: boolean
}) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      id={`editor-section-${section.id}`}
      value={section}
      dragListener={isAuthor} // Restricted to authors
      dragControls={controls}
      dragElastic={isAuthor ? 0.1 : 0} // No elasticity if locked
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`${styles.sectionBlock} ${activeSectionId === section.id ? styles.activeBlock : ''}`}
      onFocus={() => setActiveSectionId(section.id, 'paragraph')} // Default focus
    >
      <div className={styles.blockHeader}>
        {isAuthor && (
          <div
            className={styles.dragHandle}
            onPointerDown={(e) => controls.start(e)}
            style={{ cursor: 'grab' }}
          >
            <GripVertical size={16} />
          </div>
        )}
        <div onFocus={(e) => { e.stopPropagation(); setActiveSectionId(section.id, 'title'); }}>
          <EditableContent
            initialValue={section.title}
            onBlur={(val) => updateTitle(section.id, val.replace(/<[^>]*>/g, ''))} // Title should be plain text
            className={styles.sectionTitleInput}
            placeholder="Enter section title..."
          />
        </div>
        <button
          onClick={() => removeSection(section.id)}
          className={styles.removeBtn}
          title="Remove Section"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className={styles.paragraphsContainer}>
        {section.paragraphs.map((para, pIndex) => (
          <div key={pIndex} className={styles.paragraphWrapper} onFocus={(e) => { e.stopPropagation(); setActiveSectionId(section.id, 'paragraph'); }}>
            <EditableContent
              initialValue={para}
              onBlur={(val) => updateParagraph(section.id, pIndex, val)}
              className={styles.editableParagraph}
              placeholder="Start typing your paragraph content..."
            />
            <div className={styles.paragraphActions}>
              {section.paragraphs.length > 1 && (
                <button
                  onClick={() => removeParagraph(section.id, pIndex)}
                  className={styles.removeBtnPara}
                  title="Remove Paragraph"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={() => addParagraph(section.id)}
          className={styles.addParaBtn}
        >
          <Plus size={14} />
          <span>ADD PARAGRAPH</span>
        </button>
      </div>
    </Reorder.Item>
  );
};

export default function IdeaEditor({ 
  id, 
  initialContent = [], 
  isSaving, 
  onSave, 
  targetSectionId,
  isAuthor = false
}: IdeaEditorProps) {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const initialized = useRef(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [focusType, setFocusType] = useState<'title' | 'paragraph' | null>(null);

  // Ref to track and scroll to target section
  useEffect(() => {
    if (targetSectionId && initialized.current) {
      const element = document.getElementById(`editor-section-${targetSectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveSectionId(targetSectionId);
      }
    }
  }, [targetSectionId, initialized.current]);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [isSingleMode, setIsSingleMode] = useState(false);
  const { showToast } = useToast();
  const [activeStyles, setActiveStyles] = useState<{ [key: string]: boolean }>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    highlight: false
  });

  const getSelectionParentElement = (): HTMLElement | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const node = selection.anchorNode;
    if (!node) return null;
    return node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
  };

  const hasAncestorTag = (element: HTMLElement | null, tagNames: string[]): boolean => {
    let current = element;
    while (current) {
      if (tagNames.includes(current.tagName)) return true;
      current = current.parentElement;
    }
    return false;
  };

  const deriveActiveStyles = () => {
    const element = getSelectionParentElement();
    return {
      bold: hasAncestorTag(element, ['B', 'STRONG']),
      italic: hasAncestorTag(element, ['I', 'EM']),
      underline: hasAncestorTag(element, ['U']),
      strikeThrough: hasAncestorTag(element, ['S', 'STRIKE']),
      highlight: hasAncestorTag(element, ['MARK'])
    };
  };

  const toggleFormat = (format: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const parent = getSelectionParentElement();
    const formatTags = {
      bold: ['B', 'STRONG'],
      italic: ['I', 'EM'],
      underline: ['U'],
      strikeThrough: ['S', 'STRIKE']
    } as const;

    const tagName = format === 'bold' ? 'strong'
      : format === 'italic' ? 'em'
      : format === 'underline' ? 'u'
      : 's';

    const existing = parent?.closest(formatTags[format].join(','));
    if (existing instanceof HTMLElement) {
      const fragment = document.createDocumentFragment();
      while (existing.firstChild) {
        fragment.appendChild(existing.firstChild);
      }
      existing.replaceWith(fragment);
      setActiveStyles(deriveActiveStyles());
      return;
    }

    const range = selection.getRangeAt(0);
    const wrapper = document.createElement(tagName);
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    selection.addRange(newRange);
    setActiveStyles(deriveActiveStyles());
  };

  // Track selection to update toolbar state
  useEffect(() => {
    const handleSelectionChange = () => {
      setActiveStyles(deriveActiveStyles());
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Load from localStorage on mount or when initialContent arrives
  useEffect(() => {
    const processInitialContent = (content: ContentSection[]) => {
      return content.map(section => ({
        ...section,
        paragraphs: section.paragraphs.map((p: any) =>
          typeof p === 'string' ? p : structuredToHtml(p)
        )
      }));
    };

    const savedDraft = localStorage.getItem(`idea_draft_${id}`);

    // If we have a saved draft, use it
    if (savedDraft && !initialized.current) {
      try {
        setSections(processInitialContent(JSON.parse(savedDraft)));
        initialized.current = true;
      } catch (e) {
        console.error("Draft parse error", e);
      }
    }

    // If no draft yet, but initialContent arrived, use it
    if (!initialized.current && initialContent.length > 0) {
      setSections(processInitialContent(initialContent));
      initialized.current = true;
    }

    // Special case: if targetSectionId is set and we're empty, try to load initialContent
    if (targetSectionId && sections.length === 0 && initialContent.length > 0) {
      setSections(processInitialContent(initialContent));
      setIsSingleMode(true);
    } else if (targetSectionId && !initialized.current) {
      setIsSingleMode(true);
    }
  }, [id, initialContent, targetSectionId, sections.length]);

  const loadLiveContent = () => {
    const processInitialContent = (content: ContentSection[]) => {
      return content.map(section => ({
        ...section,
        paragraphs: section.paragraphs.map((p: any) =>
          typeof p === 'string' ? p : structuredToHtml(p)
        )
      }));
    };
    setSections(processInitialContent(initialContent));
    setIsSingleMode(false); // Reset single mode to show all synced content
    showToast("Live Content Loaded", "success", { subtitle: "Your local editor has been synced with the database." });
  };

  const loadLocalDraft = () => {
    const savedDraft = localStorage.getItem(`idea_draft_${id}`);
    if (savedDraft) {
      try {
        const processInitialContent = (content: ContentSection[]) => {
          return content.map(section => ({
            ...section,
            paragraphs: section.paragraphs.map((p: any) =>
              typeof p === 'string' ? p : structuredToHtml(p)
            )
          }));
        };
        setSections(processInitialContent(JSON.parse(savedDraft)));
        showToast("Local Draft Loaded", "success", { subtitle: "Successfully restored your local changes." });
      } catch (e) {
        showToast("Load Failed", "error", { subtitle: "Could not parse the local draft." });
      }
    } else {
      showToast("No Draft Found", "warning", { subtitle: "There is no local draft saved for this article." });
    }
  };

  const saveLocally = (content: ContentSection[]) => {
    setIsLocalSaving(true);

    // Simulate a brief delay for a premium feel
    setTimeout(() => {
      localStorage.setItem(`idea_draft_${id}`, JSON.stringify(content));
      onSave?.(content, false);
      setIsLocalSaving(false);
      showToast("Draft Saved Locally", "success", { subtitle: "Your changes are safe on this device." });
    }, 600);
  };

  const addSection = (index?: number) => {
    const newSection: ContentSection = {
      id: Date.now().toString(),
      title: 'New Section Title',
      paragraphs: ['']
    };

    if (typeof index === 'number') {
      const newSections = [...sections];
      newSections.splice(index, 0, newSection);
      setSections(newSections);
    } else {
      setSections([...sections, newSection]);
    }
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const addParagraph = (sectionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, paragraphs: [...s.paragraphs, ''] };
      }
      return s;
    }));
  };

  const removeParagraph = (sectionId: string, pIndex: number) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        const newParagraphs = [...s.paragraphs];
        newParagraphs.splice(pIndex, 1);
        return { ...s, paragraphs: newParagraphs.length > 0 ? newParagraphs : [''] };
      }
      return s;
    }));
  };

  const updateTitle = (id: string, title: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, title } : s));
  };

  const updateParagraph = (sectionId: string, pIndex: number, content: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        const newParagraphs = [...s.paragraphs];
        newParagraphs[pIndex] = content;
        return { ...s, paragraphs: newParagraphs };
      }
      return s;
    }));
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // After execution, we don't want to lose the active state or focus
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      // Small delay to ensure command is processed
      setTimeout(() => {
        setActiveStyles(prev => ({
          ...prev,
          [command]: document.queryCommandState(command)
        }));
      }, 10);
    }
  };

  return (
    <div className={styles.editorContainer}>
      {/* Premium Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            onClick={() => execCommand('bold')}
            title="Bold"
            className={`${styles.toolBtn} ${activeStyles.bold ? styles.toolBtnActive : ''}`}
            disabled={focusType === 'title'}
          >
            <Bold size={18} />
          </button>
          <button
            onClick={() => execCommand('italic')}
            title="Italic"
            className={`${styles.toolBtn} ${activeStyles.italic ? styles.toolBtnActive : ''}`}
            disabled={focusType === 'title'}
          >
            <Italic size={18} />
          </button>
          <button
            onClick={() => execCommand('underline')}
            title="Underline"
            className={`${styles.toolBtn} ${activeStyles.underline ? styles.toolBtnActive : ''}`}
            disabled={focusType === 'title'}
          >
            <Underline size={18} />
          </button>
          <button
            onClick={() => execCommand('strikeThrough')}
            title="Strikethrough"
            className={`${styles.toolBtn} ${activeStyles.strikeThrough ? styles.toolBtnActive : ''}`}
            disabled={focusType === 'title'}
          >
            <Strikethrough size={18} />
          </button>
          <button
            onClick={() => {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const mark = document.createElement('mark');
                mark.appendChild(range.extractContents());
                range.insertNode(mark);
                // Trigger change
                const activeEl = document.activeElement as HTMLElement;
                if (activeEl) activeEl.blur(); 
              }
            }}
            title="Highlight"
            className={`${styles.toolBtn} ${activeStyles.highlight ? styles.toolBtnActive : ''}`}
            disabled={focusType === 'title'}
          >
            <Highlighter size={18} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button onClick={() => addSection()} className={styles.specialBtn} title="Add Content Section">
            <Plus size={18} />
          </button>
          <button onClick={loadLocalDraft} className={styles.toolBtn} title="Load Local Draft">
            <History size={18} />
          </button>
          <button onClick={() => setShowSyncConfirm(true)} className={styles.toolBtn} title="Sync from Live Database">
            <RotateCw size={18} />
          </button>
        </div>

        <div className={styles.toolbarGroup} style={{ marginLeft: 'auto', gap: '12px' }}>
          <button
            onClick={() => saveLocally(sections)}
            className={`${styles.saveBtn} ${isLocalSaving ? styles.btnProcessing : ''}`}
            disabled={isLocalSaving}
          >
            {/* {isLocalSaving ? (
              <div className={styles.spinner} style={{ width: '14px', height: '14px' }}></div>
            ) : (
              <Save size={18} />
            )} */}
            <span className={isLocalSaving ? "glitchLoader": "" } style={{color:"black"}}>{isLocalSaving ? 'SAVING...' : 'SAVE DRAFT'}</span>
          </button>
          <button
            onClick={() => onSave?.(sections, true)}
            className={`${styles.publishBtn} ${isSaving ? styles.btnProcessing : ''}`}
            disabled={isSaving}
          >
            {/* {isSaving ? (
              <div className={styles.spinner}></div>
            ) : (
              <Sparkles size={18} />
            )} */}
            <span className={isSaving ? "glitchLoader": ""} style={{color:"black"}}>{isSaving ? 'PROCESSING...' : 'SAVE TO CLOUD'}</span>
          </button>
        </div>
      </div>

      <div className={styles.contentArea}>
        <Reorder.Group axis="y" values={sections} onReorder={setSections} className={styles.sectionList}>
          <AnimatePresence>
            {sections
              .filter(s => !isSingleMode || s.id === targetSectionId)
              .map((section, index) => (
                <React.Fragment key={section.id}>
                  <SectionItem
                    section={section}
                    activeSectionId={activeSectionId}
                    setActiveSectionId={(id, type) => {
                      setActiveSectionId(id);
                      setFocusType(type);
                    }}
                    updateTitle={updateTitle}
                    removeSection={removeSection}
                    updateParagraph={updateParagraph}
                    removeParagraph={removeParagraph}
                    addParagraph={addParagraph}
                    sectionsLength={sections.length}
                    isAuthor={isAuthor}
                  />

                  {/* Insert between sections */}
                  <div className={styles.insertDivider}>
                    <button
                      onClick={() => addSection(index + 1)}
                      className={styles.insertBtn}
                      title="Insert section here"
                    >
                      <Plus size={14} />
                      <span>INSERT SECTION</span>
                    </button>
                  </div>
                </React.Fragment>
              ))}
          </AnimatePresence>
        </Reorder.Group>

        {sections.length === 0 && (
          <div className={styles.emptyState}>
            <Sparkles size={48} className={styles.emptyIcon} />
            <h3>Your story is a blank canvas</h3>
            <p>Click "ADD CONTENT SECTION" to start building your idea.</p>
            <button onClick={() => addSection()} className={styles.btnSolid}>
              START WRITING
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showSyncConfirm}
        onClose={() => setShowSyncConfirm(false)}
        onConfirm={loadLiveContent}
        title="Sync from Database"
        message="This will replace your current local changes with the live content from the database. Any unsaved local edits will be lost. Are you sure you want to proceed?"
      />
    </div>
  );
}
