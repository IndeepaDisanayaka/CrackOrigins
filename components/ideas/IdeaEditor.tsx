import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  Type, Plus, Trash2, GripVertical,
  ChevronDown, ChevronUp, Save,
  Heading1, AlignLeft, TextQuote,
  Layout, Sparkles
} from 'lucide-react';
import { motion, Reorder, AnimatePresence, useDragControls } from 'framer-motion';
import styles from './IdeaEditor.module.css';
import { structuredToHtml } from '@/lib/text-parser';

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
}

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
  sectionsLength
}: {
  section: ContentSection,
  activeSectionId: string | null,
  setActiveSectionId: (id: string) => void,
  updateTitle: (id: string, title: string) => void,
  removeSection: (id: string) => void,
  updateParagraph: (sectionId: string, pIndex: number, content: string) => void,
  removeParagraph: (sectionId: string, pIndex: number) => void,
  addParagraph: (sectionId: string) => void,
  sectionsLength: number
}) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`${styles.sectionBlock} ${activeSectionId === section.id ? styles.activeBlock : ''}`}
      onFocus={() => setActiveSectionId(section.id)}
    >
      <div className={styles.blockHeader}>
        <div
          className={styles.dragHandle}
          onPointerDown={(e) => controls.start(e)}
          style={{ cursor: 'grab' }}
        >
          <GripVertical size={16} />
        </div>
        <EditableContent
          initialValue={section.title}
          onBlur={(val) => updateTitle(section.id, val.replace(/<[^>]*>/g, ''))} // Title should be plain text
          className={styles.sectionTitleInput}
          placeholder="Enter section title..."
        />
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
          <div key={pIndex} className={styles.paragraphWrapper}>
            <EditableContent
              initialValue={para}
              onBlur={(val) => updateParagraph(section.id, pIndex, val)}
              className={styles.editableParagraph}
              placeholder="Start typing your paragraph content..."
            />
            <div className={styles.paragraphActions}>
              {sectionsLength > 1 && (
                <button
                  onClick={() => removeParagraph(section.id, pIndex)}
                  className={styles.miniBtn}
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

const IdeaEditor: React.FC<IdeaEditorProps> = ({ id, initialContent = [], isSaving, onSave }) => {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const initialized = useRef(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeStyles, setActiveStyles] = useState<{ [key: string]: boolean }>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });

  // Track selection to update toolbar state
  useEffect(() => {
    const handleSelectionChange = () => {
      setActiveStyles({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough')
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Load from localStorage on mount - ONLY ONCE
  useEffect(() => {
    if (initialized.current) return;

    const processInitialContent = (content: ContentSection[]) => {
      return content.map(section => ({
        ...section,
        paragraphs: section.paragraphs.map((p: any) =>
          typeof p === 'string' ? p : structuredToHtml(p)
        )
      }));
    };

    const savedDraft = localStorage.getItem(`idea_draft_${id}`);
    if (savedDraft) {
      try {
        setSections(processInitialContent(JSON.parse(savedDraft)));
      } catch (e) {
        setSections(processInitialContent(initialContent.length > 0 ? initialContent : [
          { id: '1', title: 'Main Introduction', paragraphs: ['Start typing your first paragraph here...'] }
        ]));
      }
    } else {
      setSections(processInitialContent(initialContent.length > 0 ? initialContent : [
        { id: '1', title: 'Main Introduction', paragraphs: ['Start typing your first paragraph here...'] }
      ]));
    }
    initialized.current = true;
  }, [id, initialContent]);

  const saveLocally = (content: ContentSection[]) => {
    localStorage.setItem(`idea_draft_${id}`, JSON.stringify(content));
    onSave?.(content, false);
  };

  const addSection = () => {
    const newSection: ContentSection = {
      id: Date.now().toString(),
      title: 'New Section Title',
      paragraphs: ['']
    };
    setSections([...sections, newSection]);
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
          >
            <Bold size={18} />
          </button>
          <button
            onClick={() => execCommand('italic')}
            title="Italic"
            className={`${styles.toolBtn} ${activeStyles.italic ? styles.toolBtnActive : ''}`}
          >
            <Italic size={18} />
          </button>
          <button
            onClick={() => execCommand('underline')}
            title="Underline"
            className={`${styles.toolBtn} ${activeStyles.underline ? styles.toolBtnActive : ''}`}
          >
            <Underline size={18} />
          </button>
          <button
            onClick={() => execCommand('strikeThrough')}
            title="Strikethrough"
            className={`${styles.toolBtn} ${activeStyles.strikeThrough ? styles.toolBtnActive : ''}`}
          >
            <Strikethrough size={18} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button onClick={addSection} className={styles.specialBtn} title="Add Content Section">
            <Plus size={18} />
          </button>
        </div>

        <div className={styles.toolbarGroup} style={{ marginLeft: 'auto', gap: '12px' }}>
          <button onClick={() => saveLocally(sections)} className={styles.saveBtn}>
            <Save size={18} />
            <span>SAVE DRAFT</span>
          </button>
          <button
            onClick={() => onSave?.(sections, true)}
            className={`${styles.publishBtn} ${isSaving ? styles.btnProcessing : ''}`}
            disabled={isSaving}
          >
            {isSaving ? (
              <div className={styles.spinner}></div>
            ) : (
              <Sparkles size={18} />
            )}
            <span>{isSaving ? 'PROCESSING...' : 'SAVE TO CLOUD'}</span>
          </button>
        </div>
      </div>

      <div className={styles.contentArea}>
        <Reorder.Group axis="y" values={sections} onReorder={setSections} className={styles.sectionList}>
          <AnimatePresence>
            {sections.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                activeSectionId={activeSectionId}
                setActiveSectionId={setActiveSectionId}
                updateTitle={updateTitle}
                removeSection={removeSection}
                updateParagraph={updateParagraph}
                removeParagraph={removeParagraph}
                addParagraph={addParagraph}
                sectionsLength={sections.length}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {sections.length === 0 && (
          <div className={styles.emptyState}>
            <Sparkles size={48} className={styles.emptyIcon} />
            <h3>Your story is a blank canvas</h3>
            <p>Click "ADD CONTENT SECTION" to start building your idea.</p>
            <button onClick={addSection} className={styles.btnSolid}>
              START WRITING
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeaEditor;
