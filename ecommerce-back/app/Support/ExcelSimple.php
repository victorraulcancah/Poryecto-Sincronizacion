<?php

namespace App\Support;

use ZipArchive;

/**
 * Generador de archivos .xlsx sin librerías externas.
 *
 * Un .xlsx es un ZIP con XML adentro, y PHP trae ZipArchive, así que se puede
 * armar a mano. Se hace así porque en este proyecto `composer require` está
 * bloqueado: `tymon/jwt-auth` arrastra `lcobucci/clock`, que se declara
 * incompatible con PHP 8.3, y Composer se niega a resolver cualquier paquete
 * nuevo hasta que eso se destrabe.
 *
 * Cubre lo que hace falta para un listado: cabecera con color, anchos de
 * columna, filas alternadas, bordes, autofiltro y cabecera congelada.
 */
class ExcelSimple
{
    /** @var array<int,string> */
    private array $encabezados = [];

    /** @var array<int,array<int,string|int|float|null>> */
    private array $filas = [];

    /** @var array<int,int> Ancho de cada columna, en caracteres. */
    private array $anchos = [];

    private string $titulo = 'Hoja1';

    public function __construct(string $titulo = 'Hoja1')
    {
        // Excel no admite estos caracteres en el nombre de la hoja, y el
        // archivo se abriría dañado.
        $this->titulo = mb_substr(str_replace(['\\', '/', '*', '[', ']', ':', '?'], '', $titulo), 0, 31);
    }

    /**
     * @param  array<int,string>  $encabezados
     * @param  array<int,int>  $anchos
     */
    public function encabezados(array $encabezados, array $anchos = []): self
    {
        $this->encabezados = $encabezados;
        $this->anchos = $anchos;
        return $this;
    }

    /** @param array<int,string|int|float|null> $fila */
    public function fila(array $fila): self
    {
        $this->filas[] = $fila;
        return $this;
    }

    /** Devuelve el .xlsx como cadena binaria, listo para descargar. */
    public function contenido(): string
    {
        $ruta = tempnam(sys_get_temp_dir(), 'xlsx');

        $zip = new ZipArchive();
        $zip->open($ruta, ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml', $this->contentTypes());
        $zip->addFromString('_rels/.rels', $this->relsRaiz());
        $zip->addFromString('xl/workbook.xml', $this->workbook());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->relsWorkbook());
        $zip->addFromString('xl/styles.xml', $this->estilos());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->hoja());

        $zip->close();

        $contenido = file_get_contents($ruta);
        @unlink($ruta);

        return $contenido;
    }

    // ────────────────────────────────────────────────────────── partes del zip

    private function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>';
    }

    private function relsRaiz(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbook(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
            . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="' . $this->escapar($this->titulo) . '" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>';
    }

    private function relsWorkbook(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>';
    }

    /**
     * Tres estilos: 0 normal, 1 cabecera (rojo institucional, texto blanco) y
     * 2 fila gris, para alternar y que la tabla se lea.
     */
    private function estilos(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2">'
            . '<font><sz val="11"/><name val="Calibri"/><color rgb="FF1F2937"/></font>'
            . '<font><sz val="11"/><name val="Calibri"/><b/><color rgb="FFFFFFFF"/></font>'
            . '</fonts>'
            . '<fills count="4">'
            . '<fill><patternFill patternType="none"/></fill>'
            . '<fill><patternFill patternType="gray125"/></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FFD32027"/><bgColor indexed="64"/></patternFill></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FFF7F8FA"/><bgColor indexed="64"/></patternFill></fill>'
            . '</fills>'
            . '<borders count="2">'
            . '<border><left/><right/><top/><bottom/><diagonal/></border>'
            . '<border>'
            . '<left style="thin"><color rgb="FFE5E7EB"/></left>'
            . '<right style="thin"><color rgb="FFE5E7EB"/></right>'
            . '<top style="thin"><color rgb="FFE5E7EB"/></top>'
            . '<bottom style="thin"><color rgb="FFE5E7EB"/></bottom>'
            . '<diagonal/></border>'
            . '</borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="3">'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1">'
            . '<alignment vertical="center" wrapText="1"/></xf>'
            . '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">'
            . '<alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
            . '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">'
            . '<alignment vertical="center" wrapText="1"/></xf>'
            . '</cellXfs>'
            . '</styleSheet>';
    }

    private function hoja(): string
    {
        $ultimaColumna = $this->letra(max(1, count($this->encabezados)) - 1);
        $ultimaFila = count($this->filas) + 1;

        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';

        // Anchos de columna
        if ($this->anchos) {
            $xml .= '<cols>';
            foreach ($this->anchos as $i => $ancho) {
                $n = $i + 1;
                $xml .= '<col min="' . $n . '" max="' . $n . '" width="' . $ancho . '" customWidth="1"/>';
            }
            $xml .= '</cols>';
        }

        // La cabecera queda fija al desplazarse.
        $xml .= '<sheetViews><sheetView workbookViewId="0" tabSelected="1">'
            . '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
            . '</sheetView></sheetViews>'
            . '<sheetFormatPr defaultRowHeight="18"/>'
            . '<sheetData>';

        // Cabecera
        $xml .= '<row r="1" ht="26" customHeight="1">';
        foreach ($this->encabezados as $i => $texto) {
            $xml .= $this->celda($this->letra($i) . '1', $texto, 1);
        }
        $xml .= '</row>';

        // Filas, alternando el fondo
        foreach ($this->filas as $n => $fila) {
            $numero = $n + 2;
            $estilo = $n % 2 === 0 ? 0 : 2;
            $xml .= '<row r="' . $numero . '">';
            foreach (array_values($fila) as $i => $valor) {
                $xml .= $this->celda($this->letra($i) . $numero, $valor, $estilo);
            }
            $xml .= '</row>';
        }

        $xml .= '</sheetData>';

        // Autofiltro sobre la cabecera
        if ($this->encabezados) {
            $xml .= '<autoFilter ref="A1:' . $ultimaColumna . max(1, $ultimaFila) . '"/>';
        }

        return $xml . '</worksheet>';
    }

    // ─────────────────────────────────────────────────────────────── utilidades

    /**
     * Los números van como tales para que Excel pueda sumarlos; el resto va
     * como texto en línea (inlineStr), que evita tener que mantener la tabla
     * de cadenas compartidas.
     */
    private function celda(string $ref, string|int|float|null $valor, int $estilo): string
    {
        if ($valor === null || $valor === '') {
            return '<c r="' . $ref . '" s="' . $estilo . '"/>';
        }

        if (is_int($valor) || is_float($valor)) {
            return '<c r="' . $ref . '" s="' . $estilo . '"><v>' . $valor . '</v></c>';
        }

        return '<c r="' . $ref . '" s="' . $estilo . '" t="inlineStr">'
            . '<is><t xml:space="preserve">' . $this->escapar((string) $valor) . '</t></is></c>';
    }

    /** 0 => A, 25 => Z, 26 => AA… */
    private function letra(int $indice): string
    {
        $letra = '';
        $indice++;
        while ($indice > 0) {
            $resto = ($indice - 1) % 26;
            $letra = chr(65 + $resto) . $letra;
            $indice = intdiv($indice - 1, 26);
        }
        return $letra ?: 'A';
    }

    private function escapar(string $texto): string
    {
        // Los caracteres de control rompen el XML y Excel marca el archivo
        // como dañado sin decir por qué.
        $texto = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $texto) ?? '';

        return htmlspecialchars($texto, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
