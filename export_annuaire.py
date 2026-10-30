#!/usr/bin/env python3
"""
Extrait l'annuaire des entreprises ACPCE et l'exporte en Excel
"""

import json
import requests
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import sys

def fetch_companies():
    """Récupère les données des entreprises depuis l'API"""
    try:
        # Récupère les données depuis l'API locale
        response = requests.get('http://localhost/api/entreprises-acpce.php?refresh=1', timeout=30)
        response.raise_for_status()
        data = response.json()

        if isinstance(data, dict):
            items = data.get('items', [])
            print(f"✓ {len(items)} entreprises récupérées")
            return items
        elif isinstance(data, list):
            print(f"✓ {len(data)} entreprises récupérées")
            return data
        else:
            print("⚠ Format de réponse inattendu")
            return []
    except requests.exceptions.RequestException as e:
        print(f"✗ Erreur lors de la récupération des données: {e}")
        return []

def create_excel(companies, output_file):
    """Crée un fichier Excel avec les données des entreprises"""

    # Crée un nouveau classeur
    wb = Workbook()
    ws = wb.active
    ws.title = "Annuaire Entreprises"

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
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col)
        cell.value = header
        cell.font = Font(bold=True, color="FFFFFF", size=11)
        cell.fill = PatternFill(start_color="1F2937", end_color="1F2937", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # Ajoute les données
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

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
            cell.value = value
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    # Ajuste la largeur des colonnes
    column_widths = [12, 25, 18, 12, 25, 25, 12, 10, 15, 12, 15, 15, 12, 12]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width

    # Gèle la première ligne
    ws.freeze_panes = "A2"

    # Sauvegarde le fichier
    wb.save(output_file)
    print(f"✓ Fichier créé: {output_file}")

def main():
    print("=== Extraction Annuaire Entreprises ACPCE ===\n")

    # Récupère les données
    print("Récupération des données...")
    companies = fetch_companies()

    if not companies:
        print("✗ Aucune donnée à exporter")
        sys.exit(1)

    # Crée le fichier Excel
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"annuaire_entreprises_{timestamp}.xlsx"

    print(f"\nCréation du fichier Excel...")
    create_excel(companies, output_file)

    print(f"\n✓ Export terminé avec succès!")
    print(f"  Nombre d'entreprises: {len(companies)}")
    print(f"  Fichier: {output_file}")

if __name__ == "__main__":
    main()
