import sys
from docx import Document
from docx.shared import Inches

def insert_images():
    doc = Document("taskinator_thesis_final.docx")
    
    tables_to_remove = []
    
    for table in doc.tables:
        if table.rows:
            cell_text = table.cell(0, 0).text.strip()
            if cell_text.startswith("[ Image Placeholder: ") and cell_text.endswith(" ]"):
                img_path = cell_text.replace("[ Image Placeholder: ", "").replace(" ]", "").strip()
                
                if img_path == "ICFAI University Logo":
                    img_path = "diagrams/logo.png"
                
                parent = table._element.getparent()
                idx = parent.index(table._element)
                
                try:
                    p = doc.add_paragraph()
                    r = p.add_run()
                    # Use exact image width or slightly scaled to fit page bounds
                    r.add_picture(img_path, width=Inches(6.5))
                    p.alignment = 1 # 1 is center
                    
                    parent.insert(idx, p._element)
                    tables_to_remove.append(table._element)
                    print(f"Inserted {img_path}")
                except Exception as e:
                    print(f"Failed to insert {img_path}: {e}")
                    
    for tbl in tables_to_remove:
        tbl.getparent().remove(tbl)
        
    doc.save("taskinator_thesis_final.docx")
    print("Saved taskinator_thesis_final.docx with images.")

if __name__ == "__main__":
    insert_images()
