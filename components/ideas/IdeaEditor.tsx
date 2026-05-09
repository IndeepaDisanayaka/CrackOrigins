import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  Type, Plus, Trash2, GripVertical, 
  ChevronDown, ChevronUp, Save,
  Heading1, AlignLeft, TextQuote,
  Layout, Sparkles
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import styles from './IdeaEditor.module.css';

interface ContentSection {
  id: string;
  title: string;
  paragraphs: string[];
}

interface IdeaEditorProps {
  initialContent?: ContentSection[];
  onSave?: (content: ContentSection[]) => void;
}

const IdeaEditor: React.FC<IdeaEditorProps> = ({ initialContent = [], onSave }) => {
  const [sections, setSections] = useState<ContentSection[]>(
    initialContent.length > 0 ? initialContent : [
      { id: '1', title: 'Main Introduction', paragraphs: ['Start typing your first paragraph here...'] }
    ]
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

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
  };

  return (
    <div className={styles.editorContainer}>
      {/* Premium Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button onClick={() => execCommand('bold')} title="Bold" className={styles.toolBtn}>
            <Bold size={18} />
          </button>
          <button onClick={() => execCommand('italic')} title="Italic" className={styles.toolBtn}>
            <Italic size={18} />
          </button>
          <button onClick={() => execCommand('underline')} title="Underline" className={styles.toolBtn}>
            <Underline size={18} />
          </button>
          <button onClick={() => execCommand('strikeThrough')} title="Strikethrough" className={styles.toolBtn}>
            <Strikethrough size={18} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button onClick={addSection} className={styles.specialBtn} title="Add Content Section">
            <Plus size={18} />
          </button>
        </div>

        <div className={styles.toolbarGroup} style={{ marginLeft: 'auto' }}>
          <button onClick={() => onSave?.(sections)} className={styles.saveBtn}>
            <Save size={18} />
            <span>SAVE DRAFT</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className={styles.contentArea}>
        <Reorder.Group axis="y" values={sections} onReorder={setSections} className={styles.sectionList}>
          <AnimatePresence>
            {sections.map((section, sIndex) => (
              <Reorder.Item 
                key={section.id} 
                value={section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`${styles.sectionBlock} ${activeSectionId === section.id ? styles.activeBlock : ''}`}
                onFocus={() => setActiveSectionId(section.id)}
              >
                <div className={styles.blockHeader}>
                  <div className={styles.dragHandle}>
                    <GripVertical size={16} />
                  </div>
                  <div 
                    className={styles.sectionTitleInput}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateTitle(section.id, e.currentTarget.innerText)}
                    data-placeholder="Enter section title..."
                  >
                    {section.title}
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
                    <div key={pIndex} className={styles.paragraphWrapper}>
                      <div 
                        className={styles.editableParagraph}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => updateParagraph(section.id, pIndex, e.currentTarget.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: para }}
                        data-placeholder="Start typing your paragraph content..."
                      />
                      <div className={styles.paragraphActions}>
                        {section.paragraphs.length > 1 && (
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
