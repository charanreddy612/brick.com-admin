// src/components/common/SafeQuill.jsx
import React, { useEffect, useState, forwardRef } from "react";
import { uploadBlogImage } from "../../services/blogService";

/** Convert dataURL -> File */
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

/** Minimal empty-delta fallback for clipboard matcher */
const EMPTY_DELTA = { ops: [] };

const SafeQuill = forwardRef((props, ref) => {
  const [Editor, setEditor] = useState(null);

  // Lazy-load the Quill editor only on client
  useEffect(() => {
    let mounted = true;
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const mod = await import("react-quill-new");
        await import("react-quill-new/dist/quill.snow.css");
        if (mounted) setEditor(() => mod.default);
      } catch (err) {
        console.error("Failed to load Quill editor:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Attach clipboard / paste handlers once editor instance available
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Editor || !ref) return;

    let cancelled = false;
    let removePasteListener = () => {};

    (async () => {
      // Wait briefly for forwarded ref to hold underlying editor
      let editor = null;
      for (let i = 0; i < 20; i++) {
        editor = ref.current?.getEditor?.();
        if (editor) break;
        // small delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 50));
      }
      if (!editor || cancelled) return;

      // Clipboard matcher: intercept <img src="data:..."> nodes (base64)
      const clipboardHandler = (node, delta) => {
        try {
          const src = (node && node.getAttribute && node.getAttribute("src")) || "";
          if (typeof src === "string" && src.startsWith("data:image/")) {
            const sel = editor.getSelection(true);
            const insertIndex = (sel && sel.index) || editor.getLength();

            // upload async and insert returned URL
            (async () => {
              try {
                const file = dataURLtoFile(src, `pasted-${Date.now()}.png`);
                const res = await uploadBlogImage(file);
                const url = res?.url || res;
                if (url) {
                  // remove any selection char at insertIndex then insert image
                  try {
                    editor.deleteText(insertIndex, 1);
                  } catch (e) {
                    // ignore if nothing to delete
                  }
                  editor.insertEmbed(insertIndex, "image", url);
                  editor.setSelection(insertIndex + 1);
                }
              } catch (err) {
                console.error("Failed to upload pasted image:", err);
              }
            })();

            // prevent base64 from being inserted
            return EMPTY_DELTA;
          }
        } catch (err) {
          console.error("clipboardHandler error:", err);
        }
        return delta;
      };

      try {
        editor.clipboard.addMatcher("img", clipboardHandler);
      } catch (e) {
        console.warn("Failed to add clipboard matcher:", e);
      }

      // Paste event listener: handles image files from clipboard (file-kind items)
      const onPaste = (e) => {
        try {
          const items = e.clipboardData?.items;
          if (!items) return;

          const imageFiles = [];
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it && it.kind === "file" && it.type && it.type.startsWith("image/")) {
              const f = it.getAsFile();
              if (f) imageFiles.push(f);
            }
          }
          if (!imageFiles.length) return;

          // prevent default insertion; upload + insert ourselves
          e.preventDefault();
          const sel = editor.getSelection(true);
          let idx = (sel && sel.index) || editor.getLength();

          (async () => {
            for (const file of imageFiles) {
              try {
                const res = await uploadBlogImage(file);
                const url = res?.url || res;
                if (url) {
                  editor.insertEmbed(idx, "image", url);
                  idx += 1;
                  editor.setSelection(idx);
                }
              } catch (err) {
                console.error("Failed to upload clipboard image file:", err);
              }
            }
          })();
        } catch (err) {
          console.error("onPaste handler failed:", err);
        }
      };

      try {
        editor.root.addEventListener("paste", onPaste);
        removePasteListener = () => {
          try {
            editor.root.removeEventListener("paste", onPaste);
          } catch (err) {
            /* ignore cleanup errors */
          }
        };
      } catch (err) {
        console.warn("Failed to attach paste listener:", err);
      }
    })();

    return () => {
      cancelled = true;
      try {
        removePasteListener();
      } catch (err) {
        /* ignore */
      }
    };
  }, [Editor, ref]);

  if (!Editor) return <div>Loading editor...</div>;

  return (
    <div className="safe-quill flex flex-col h-[300px]">
      <Editor ref={ref} {...props} />
    </div>
  );
});

export default SafeQuill;
