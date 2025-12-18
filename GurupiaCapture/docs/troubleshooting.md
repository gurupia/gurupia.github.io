# GurupiaCapture Troubleshooting Log
**Last Updated:** 2025-12-18

This document records significant technical issues encountered during development, their root causes, and the solutions applied.

---

## 1. Overlay Drawing Visibility & Interaction
**Problem:**
The drawing overlay (`OverlayDrawingForm`) using `WS_EX_LAYERED` and `WS_EX_TRANSPARENT` failed to consistently render strokes or handle mouse input.
- **Symptoms:** Strokes were invisible, or the window blocked interaction with the desktop even when "click-through" was intended. The context menu passed through the transparent window and didn't appear.
- **Root Cause:** Windows Forms controls (like `ContextMenuStrip`) and GDI+ drawing often conflict with `WS_EX_LAYERED` when alpha blending is involved, causing rendering artifacts or z-order issues.

**Solution: "Freeze Mode" Implementation**
Instead of a live transparent overlay, we implemented a **Screen Freeze** approach.
1. **On Enter Drawing Mode:** Capture a full-screen screenshot of the desktop.
2. **Background:** Set this screenshot as the `BackgroundImage` of a standard, opaque Windows Form (Opacity 1.0).
3. **Drawing:** Draw directly on this form using standard GDI+.
4. **Result:** 100% reliable visibility, working Context Menus, and no click-through issues (since the form effectively replaces the screen view temporarily).
5. **On Exit:** Hide the form to return control to the desktop.

---

## 2. Recording Preview Black Screen (Interop)
**Problem:**
The Real-Time Preview in the Recording Control Bar showed a black screen or static image, even though recording was active.
- **Symptoms:** `previewPictureBox` remained black.
- **Root Cause:** **Struct Memory Alignment Mismatch** between C# and C++.
    - The `RecordOptions` struct contained `bool` fields (1 byte) followed by pointers (8 bytes on x64).
    - C# `[StructLayout(LayoutKind.Sequential)]` and C++ compilers handled padding differently, causing the `SharedMemoryName` pointer to be read from the wrong offset in C++.
    - As a result, C++ received a null or invalid MMF name and never wrote frame data.

**Solution: Explicit API for Shared Memory**
Instead of relying on fragile struct alignment:
1. **New C++ API:** Added `Recorder_SetSharedMemory(name, size, eventName)` to explicitly set MMF parameters globally in the native core.
2. **C# Integration:** Called this API via P/Invoke right before `Recorder_Start`.
3. **Result:** Correct MMF connection regardless of struct padding changes.

---

## 3. Preview UI Clipping
**Problem:**
When expanding the recording toolbar to show the preview, the preview area was invisible/clipped.
- **Root Cause:** The `OnPaint` event handler forced a **Capsule Shape** using `Region` with a hardcoded height of 60px. When the form resized to 350px for the preview, the drawing region remained clipped to the top 60px.

**Solution: Dynamic Region Shaping**
- Modified `OnPaint` to check `this.Height`.
- If `Height > 80` (Preview Mode), draw a **Rounded Rectangle** covering the full size.
- If `Height <= 80` (Toolbar Mode), draw the original **Capsule**.

---

## 4. "Recording Complete" Message Visibility
**Problem:**
The `MessageBox` announcing recording completion appeared behind other open windows, confusing the user.
- **Root Cause:** The `MessageBox` owner was the hidden `MainForm` or implied main thread window, which wasn't top-most.

**Solution: TopMost Owner**
- Created a temporary, invisible `Form` with `TopMost = true`.
- Used this existing, top-most form as the owner argument for `MessageBox.Show(owner, ...)`.
- **Result:** Message box forces itself to the visual foreground.

---

## 5. Build & Deployment Issues
**Problem:**
`EntryPointNotFoundException` for `Recorder_SetSharedMemory`.
- **Root Cause:** `build_app.bat` only built the C# project and copied an *existing* (old) Core DLL. It did not rebuild the C++ Core when C++ code was modified.
- **Solution:** Manually rebuilt C++ Core using `v143` toolset (`msbuild ... /p:PlatformToolset=v143`) and updated the DLL in the C# execution directory.
