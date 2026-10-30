#!/usr/bin/env python3
"""
Extrait l'annuaire des entreprises ACPCE et l'exporte en Excel
Version qui récupère depuis le site en ligne
"""

import requests
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def fetch_companies():
    """Récupère les données des entreprises depuis le site en ligne"""
    try:
        # Récupère les données depuis le site en ligne
        url = 'https://almathe.net/api/entreprises-acpce.php?refresh=1'
        print(f"Récupération depuis: {url}")

        response = requests.get(url, timeout=60)
        response.raise_for_status()
        data = response.json()

        if isinstance(data, dict):
            items = data.get('items', [])
            count = data.get('count', len(items))
            source = data.get('source', 'N/A')
            fetched_at = data.get('fetchedAt', 'N/A')
            print(f"✓ {count} entreprises récupérées")
            print(f"  Source: {source}")
            print(f"  Récupéré à: {fetched_at}")
            return items
        elif isinstance(data, list):
            print(f"✓ {len(data)} entreprises récupérées")
            return data
        else:
            print("⚠ Format de réponse inattendu")
            return []
    except requests.exceptions.ConnectionError:
        print("✗ Erreur: Impossible de se connecter à almathe.net")
        return []
    except requests.exceptions.RequestException as e:
        print(f"✗ Erreur lors de la récupération: {e}")
        return []
    except ValueError as e:
        print(f"✗ Erreur lors du décodage JSON: {e}")
        return []

def create_excel(companies, output_file):
    """Crée un fichier Excel avec les données des entreprises"""

    # Crée un nouveau classeur
    wb = Workbook()
    ws = wb.active
    ws.title = "Annuaire"

    # Définit les en-têtes
    headers = [
        "Code",
        "Dénomination",
        "Forme Juridique",
        "Capital",
        "Adresse",
        "Activité",
        "Code Activité",
        "Durée",
        "RCCM",
        "Date RCCM",
        "Nom Responsable",
        "Prénom Responsable",
        "Nationalité",
        "Date Création"
    ]

    # Ajoute les en-têtes
    header_fill = PatternFill(start_color="1F2937", end_color="1F2937", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment

    # Ajoute les données
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    cell_alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    for row_idx, company in enumerate(companies, 2):
        row_data = [
            company.get('code', ''),
            company.get('denomination', ''),
            company.get('formeJuridique', ''),
            company.get('capital', ''),
            company.get('adresse', ''),
            company.get('activite', ''),
            company.get('codeActivite', ''),
            company.get('duree', ''),
            company.get('rccm', ''),
            company.get('dateRccm', ''),
            company.get('nom', ''),
            company.get('prenom', ''),
            company.get('nationalite', ''),
            company.get('dateCreation', ''),
        ]

        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col)
            cell.value = value if value else ''
            cell.border = thin_border
            cell.alignment = cell_alignment

    # Ajuste la largeur des colonnes
    column_widths = [12, 25, 18, 12, 30, 25, 12, 10, 15, 12, 15, 15, 12, 12]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width

    # Gèle la première ligne et la première colonne
    ws.freeze_panes = "A2"

    # Sauvegarde le fichier
    wb.save(output_file)
    print(f"✓ Fichier créé: {output_file}")

def main():
    print("=" * 50)
    print("Export Annuaire Entreprises ACPCE - Almathe")
    print("=" * 50)
    print()

    # Récupère les données
    print("Récupération des données...\n")
    companies = fetch_companies()

    if not companies:
        print("\n✗ Aucune donnée à exporter")
        return

    # Trie par dénomination
    companies_sorted = sorted(companies, key=lambda x: x.get('denomination', '').lower())

    # Crée le fichier Excel
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"annuaire_entreprises_{timestamp}.xlsx"

    print(f"\nCréation du fichier Excel...")
    create_excel(companies_sorted, output_file)

    print(f"\n" + "=" * 50)
    print("✓ Export terminé avec succès!")
    print(f"  • Entreprises exportées: {len(companies_sorted)}")
    print(f"  • Fichier: {output_file}")
    print("=" * 50)

if __name__ == "__main__":
    main()
