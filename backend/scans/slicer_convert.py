"""
slicer_convert.py
-----------------
This script runs INSIDE 3D Slicer's Python environment (not standard Python).
Django/Celery calls Slicer headlessly and passes this script to it.

How Slicer calls it:
    Slicer --no-main-window --python-script /path/to/slicer_convert.py -- <dicom_dir> <output_stl>

What it does:
    1. Loads a DICOM series from <dicom_dir>
    2. Segments bone/anatomy using Hounsfield Unit (HU) threshold (200–3000 HU)
    3. Exports the segmentation as an STL file to <output_stl>
    4. Exits Slicer
"""

import sys
import os


def main():
    # Args are passed after the '--' separator
    try:
        sep = sys.argv.index('--')
        args = sys.argv[sep + 1:]
    except ValueError:
        args = sys.argv[1:]

    if len(args) < 2:
        print("[SlicerConvert] ERROR: Expected arguments: <dicom_dir> <output_stl>")
        sys.exit(1)

    dicom_dir = args[0]
    output_stl = args[1]

    print(f"[SlicerConvert] DICOM source : {dicom_dir}")
    print(f"[SlicerConvert] Output STL   : {output_stl}")

    # ------------------------------------------------------------------ #
    # 1. Import Slicer modules (only available inside Slicer's Python)
    # ------------------------------------------------------------------ #
    try:
        import slicer  # type: ignore  # provided by Slicer runtime
        from DICOMLib import DICOMUtils  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "This script must be executed inside 3D Slicer's Python environment "
            "(where 'slicer' and 'DICOMLib' are available)."
        ) from e

    # ------------------------------------------------------------------ #
    # 2. Load DICOM series
    # ------------------------------------------------------------------ #
    print("[SlicerConvert] Importing DICOM files …")
    with DICOMUtils.TemporaryDICOMDatabase() as db:
        DICOMUtils.importDicom(dicom_dir, db)
        patient_ids = db.patients()

        if not patient_ids:
            print("[SlicerConvert] ERROR: No DICOM patients found in directory")
            slicer.app.quit()
            sys.exit(1)

        # Load the first patient
        DICOMUtils.loadPatientByUID(patient_ids[0])

    # ------------------------------------------------------------------ #
    # 3. Get the scalar volume node
    # ------------------------------------------------------------------ #
    volume_node = slicer.mrmlScene.GetFirstNodeByClass('vtkMRMLScalarVolumeNode')
    if not volume_node:
        print("[SlicerConvert] ERROR: No volume node found after DICOM load")
        slicer.app.quit()
        sys.exit(1)

    print(f"[SlicerConvert] Volume loaded: {volume_node.GetName()}")

    # ------------------------------------------------------------------ #
    # 4. Create segmentation using Threshold effect
    #    HU 200–3000 captures cortical bone and dense tissue.
    #    Adjust thresholds here if needed for soft tissue (e.g. 30–150).
    # ------------------------------------------------------------------ #
    seg_node = slicer.mrmlScene.AddNewNodeByClass('vtkMRMLSegmentationNode')
    seg_node.CreateDefaultDisplayNodes()
    seg_node.SetReferenceImageGeometryParameterFromVolumeNode(volume_node)

    segment_id = seg_node.GetSegmentation().AddEmptySegment('Anatomy')

    seg_editor = slicer.qMRMLSegmentEditorWidget()
    seg_editor.setMRMLScene(slicer.mrmlScene)
    seg_editor_node = slicer.mrmlScene.AddNewNodeByClass('vtkMRMLSegmentEditorNode')
    seg_editor.setMRMLSegmentEditorNode(seg_editor_node)
    seg_editor.setSegmentationNode(seg_node)
    seg_editor.setSourceVolumeNode(volume_node)
    seg_editor.setCurrentSegmentID(segment_id)

    seg_editor.setActiveEffectByName('Threshold')
    effect = seg_editor.activeEffect()
    effect.setParameter('MinimumThreshold', '200')
    effect.setParameter('MaximumThreshold', '3000')
    effect.self().onApply()

    print("[SlicerConvert] Segmentation complete")

    # ------------------------------------------------------------------ #
    # 5. Export STL
    # ------------------------------------------------------------------ #
    output_dir = os.path.dirname(os.path.abspath(output_stl))
    os.makedirs(output_dir, exist_ok=True)

    slicer.vtkSlicerSegmentationsModuleLogic \
        .ExportSegmentsClosedSurfaceRepresentationToFiles(
            output_dir,
            seg_node,
            None,    # export all segments
            'STL',
            True,    # merge all segments into one file
            1.0,     # smoothing factor (0 = none, 1 = max)
            False,   # lossless
        )

    # Rename whichever .stl was created to the desired output path
    stl_files = [f for f in os.listdir(output_dir) if f.lower().endswith('.stl')]
    if not stl_files:
        print("[SlicerConvert] ERROR: Slicer did not produce an STL file")
        slicer.app.quit()
        sys.exit(1)

    generated = os.path.join(output_dir, stl_files[0])
    if generated != output_stl:
        os.replace(generated, output_stl)

    print(f"[SlicerConvert] STL exported: {output_stl}")

    # ------------------------------------------------------------------ #
    # 6. Done — exit Slicer
    # ------------------------------------------------------------------ #
    slicer.app.quit()


main()
