import { memo } from "react";
import { groupBy } from 'lodash';
import cssParser from 'prettier/parser-postcss';
import prettier from 'prettier/standalone';
import { useCallback, useEffect, useRef, useState } from 'react';
import AceEditor from 'react-ace';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import short from 'short-uuid';
import { addProto, deleteProto, getAllProtos, getItem, importFromUrl, setItem, updateProto } from '../storage';
import { CSSProto } from '../types';
import { CSSEditor } from './cssEditor';
import { useHash } from './hooks/useHash';
export const Options = memo(() => {
  const {
    hashId,
    hashNewUrl
  } = useHash();
  const [allCssProtosByUrl, setAllCssProtosByUrl] = useState<{
    [url: string]: CSSProto[];
  }>({});
  const allCssProtosById = useRef<{
    [id: string]: CSSProto;
  }>({});
  const protoName = useRef('');
  const urlMatch = useRef('');
  const importUrl = useRef('');
  const editorRef = useRef<AceEditor>(null);
  const updateProtos = () => getAllProtos().then(cssProtos => {
    setAllCssProtosByUrl(groupBy(cssProtos, 'urlMatch'));

    // group by the id that is unique, so i don't want an array inside (groupBy)
    allCssProtosById.current = cssProtos.reduce((acc, proto) => {
      acc[proto.id] = proto;
      return acc;
    }, ({} as {
      [id: string]: CSSProto;
    }));
  });
  useEffect(() => {
    if (!editorRef.current) return;
    if (!allCssProtosById.current[hashId]) {
      protoName.current.value = '';
      urlMatch.current.value = hashNewUrl || '';
      editorRef.current.editor.setValue('');
    } else {
      protoName.current.value = allCssProtosById.current[hashId].name;
      urlMatch.current.value = allCssProtosById.current[hashId].urlMatch;
      editorRef.current.editor.setValue(allCssProtosById.current[hashId].cssRaw);
      editorRef.current.editor.gotoLine(0, 0, false); // to prevent all text from being selected
    }
  }, [allCssProtosById.current, hashId, hashNewUrl, editorRef]);
  const saveProto = useCallback(async () => {
    const cssFromEditor = editorRef.current?.editor.getValue() || '';
    // beautify the css using prettier
    let formattedCss = cssFromEditor;
    try {
      formattedCss = prettier.format(cssFromEditor, {
        parser: 'css',
        plugins: [cssParser]
      });
    } catch (error: any) {
      toast(<>
          Error in CSS!
          <br />
          <span style={{
          opacity: 0.5
        }}>Check console for details</span>
        </>, {
        type: 'warning',
        autoClose: 2000,
        hideProgressBar: false
      });
      // if formatting goes wrong i want to save the original css because
      // i do not want to lose work
    }

    // check if the cssproto exists
    if (!allCssProtosById.current[hashId]) {
      // if it does not exist create a new one
      const newProto: CSSProto = {
        id: hashId || short.generate(),
        name: protoName.current.value.trim() || 'untitled',
        urlMatch: urlMatch.current.value,
        cssRaw: formattedCss
      };
      await addProto(newProto);
      // immediately navigate to the new hash
      location.hash = newProto.id;
    } else {
      await updateProto(hashId, {
        name: protoName.current.value,
        urlMatch: urlMatch.current.value,
        cssRaw: formattedCss
      });
    }

    // update the list of protos
    await updateProtos();

    // show the toast
    toast(<>
        Saved!
        <br />
        <span style={{
        opacity: 0.5
      }}>{protoName.current.value}</span>
      </>, {
      type: 'success'
    });
  }, [hashId, editorRef, protoName.current.value, updateProtos]);
  const handleCrtlS = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveProto();
    }
  }, [saveProto]);
  useEffect(() => {
    updateProtos();
    getItem<string>('import-url').then(url => importUrl.current.value = url || '');
  }, []);
  useEffect(() => {
    document.addEventListener('keydown', handleCrtlS);
    return () => document.removeEventListener('keydown', handleCrtlS);
  }, [handleCrtlS]);
  return <>
      <div className="grid" style={{
      gridTemplateColumns: '.3fr .7fr',
      paddingBottom: '2rem'
    }}>
        <div>
          <h4 style={{
          marginBottom: '.5rem'
        }}>Prototypes</h4>
          <div>
            <input type="text" placeholder="Import from URL" ref={importUrl} style={{
            fontSize: '0.8rem'
          }} />
            <button onClick={() => {
            try {
              new URL(importUrl.current.value);
            } catch (error) {
              return toast('Invalid URL', {
                type: 'error'
              });
            }
            confirm('If you pull, prototypes with the same id will be overwritten.\nAre you sure?') && importFromUrl(importUrl.current.value).then(updateProtos).then(() => toast('Pulled!', {
              type: 'success'
            })).then(() => setItem('import-url', importUrl.current.value));
          }} className=" outline" style={{
            fontSize: '1.5rem',
            padding: 0,
            lineHeight: 0,
            marginBottom: '1rem'
          }}>
              <i className="bi bi-arrow-down-short" />
            </button>
          </div>
          <button onClick={() => location.hash = short.generate()} className=" outline" style={{
          fontSize: '1.5rem',
          padding: 0,
          lineHeight: 0
        }}>
            <i className="bi bi-plus" />
          </button>

          {Object.keys(allCssProtosByUrl).sort().map(urlMatch => <div key={urlMatch} className="my-2">
                {urlMatch.length > 0 ? urlMatch : '[all websites]'}
                {(allCssProtosByUrl[urlMatch] || []).map(cssProto => <div style={{
            paddingLeft: '1rem'
          }}>
                    <a href={'#' + cssProto.id} style={{
              color: cssProto.id == hashId ? 'var(--contrast)' : undefined
            }}>
                      {cssProto.name}
                    </a>
                  </div>)}
              </div>)}
        </div>
        {/* -------------------------------------------------------------------------------- */}
        {hashId && <div>
            <div className="grid">
              <label style={{
            marginBottom: 0
          }}>
                Name
                <input type="text" ref={protoName} required />
              </label>
              <label style={{
            marginBottom: 0
          }}>
                URL contains
                <input type="text" ref={urlMatch} required />
              </label>
              <div style={{
            display: 'flex',
            alignItems: 'end',
            gap: '1rem'
          }}>
                <button onClick={() => saveProto()} style={{
              width: 'initial',
              flexGrow: 1,
              marginBottom: 'var(--spacing)'
            }}>
                  <i className="bi bi-save" /> Save
                </button>
                <button className="outline secondary" onClick={() => confirm('Delete "' + protoName.current.value + '" ?') && deleteProto(hashId).then(updateProtos).then(() => location.hash = '')} style={{
              width: 'initial'
            }}>
                  <i className="bi bi-trash" />
                </button>
              </div>
            </div>
            <CSSEditor ref={editorRef} />
          </div>}
      </div>
      <ToastContainer closeButton={false} theme="dark" autoClose={500} toastStyle={{
      backgroundColor: 'var(--muted-border-color)',
      borderRadius: 'var(--border-radius)'
    }} hideProgressBar />
    </>;
});