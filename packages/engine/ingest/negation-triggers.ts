/*
Ported from DFKI-NLP/pynegex cotik-de (512 entries), revision a4cabe5c1203bd6b0590afca20a55c3a6a8c8c2a.
https://github.com/DFKI-NLP/pynegex/blob/main/pynegex/model/triggersets/cotik-de.txt
Upstream licence: Python Software Foundation licence; preserved below.
This TypeScript adaptation preserves trigger tags; matching uses a bounded scope.

A. HISTORY OF THE SOFTWARE
==========================

Python was created in the early 1990s by Guido van Rossum at Stichting
Mathematisch Centrum (CWI, see http://www.cwi.nl) in the Netherlands
as a successor of a language called ABC.  Guido remains Python's
principal author, although it includes many contributions from others.

In 1995, Guido continued his work on Python at the Corporation for
National Research Initiatives (CNRI, see http://www.cnri.reston.va.us)
in Reston, Virginia where he released several versions of the
software.

In May 2000, Guido and the Python core development team moved to
BeOpen.com to form the BeOpen PythonLabs team.  In October of the same
year, the PythonLabs team moved to Digital Creations (now Zope
Corporation, see http://www.zope.com).  In 2001, the Python Software
Foundation (PSF, see http://www.python.org/psf/) was formed, a
non-profit organization created specifically to own Python-related
Intellectual Property.  Zope Corporation is a sponsoring member of
the PSF.

All Python releases are Open Source (see http://www.opensource.org for
the Open Source Definition).  Historically, most, but not all, Python
releases have also been GPL-compatible; the table below summarizes
the various releases.

    Release         Derived     Year        Owner       GPL-
                    from                                compatible? (1)

    0.9.0 thru 1.2              1991-1995   CWI         yes
    1.3 thru 1.5.2  1.2         1995-1999   CNRI        yes
    1.6             1.5.2       2000        CNRI        no
    2.0             1.6         2000        BeOpen.com  no
    1.6.1           1.6         2001        CNRI        yes (2)
    2.1             2.0+1.6.1   2001        PSF         no
    2.0.1           2.0+1.6.1   2001        PSF         yes
    2.1.1           2.1+2.0.1   2001        PSF         yes
    2.2             2.1.1       2001        PSF         yes
    2.1.2           2.1.1       2002        PSF         yes
    2.1.3           2.1.2       2002        PSF         yes
    2.2.1           2.2         2002        PSF         yes
    2.2.2           2.2.1       2002        PSF         yes
    2.2.3           2.2.2       2003        PSF         yes
    2.3             2.2.2       2002-2003   PSF         yes
    2.3.1           2.3         2002-2003   PSF         yes
    2.3.2           2.3.1       2002-2003   PSF         yes
    2.3.3           2.3.2       2002-2003   PSF         yes
    2.3.4           2.3.3       2004        PSF         yes
    2.3.5           2.3.4       2005        PSF         yes
    2.4             2.3         2004        PSF         yes
    2.4.1           2.4         2005        PSF         yes
    2.4.2           2.4.1       2005        PSF         yes
    2.4.3           2.4.2       2006        PSF         yes
    2.5             2.4         2006        PSF         yes

Footnotes:

(1) GPL-compatible doesn't mean that we're distributing Python under
    the GPL.  All Python licenses, unlike the GPL, let you distribute
    a modified version without making your changes open source.  The
    GPL-compatible licenses make it possible to combine Python with
    other software that is released under the GPL; the others don't.

(2) According to Richard Stallman, 1.6.1 is not GPL-compatible,
    because its license has a choice of law clause.  According to
    CNRI, however, Stallman's lawyer has told CNRI's lawyer that 1.6.1
    is "not incompatible" with the GPL.

Thanks to the many outside volunteers who have worked under Guido's
direction to make these releases possible.


B. TERMS AND CONDITIONS FOR ACCESSING OR OTHERWISE USING PYTHON
===============================================================

PYTHON SOFTWARE FOUNDATION LICENSE VERSION 2
--------------------------------------------

1. This LICENSE AGREEMENT is between the Python Software Foundation
("PSF"), and the Individual or Organization ("Licensee") accessing and
otherwise using this software ("Python") in source or binary form and
its associated documentation.

2. Subject to the terms and conditions of this License Agreement, PSF
hereby grants Licensee a nonexclusive, royalty-free, world-wide
license to reproduce, analyze, test, perform and/or display publicly,
prepare derivative works, distribute, and otherwise use Python
alone or in any derivative version, provided, however, that PSF's
License Agreement and PSF's notice of copyright, i.e., "Copyright (c)
2001, 2002, 2003, 2004, 2005, 2006 Python Software Foundation; All Rights
Reserved" are retained in Python alone or in any derivative version 
prepared by Licensee.

3. In the event Licensee prepares a derivative work that is based on
or incorporates Python or any part thereof, and wants to make
the derivative work available to others as provided herein, then
Licensee hereby agrees to include in any such work a brief summary of
the changes made to Python.

4. PSF is making Python available to Licensee on an "AS IS"
basis.  PSF MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PSF MAKES NO AND
DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS
FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF PYTHON WILL NOT
INFRINGE ANY THIRD PARTY RIGHTS.

5. PSF SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF PYTHON
FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS
A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING PYTHON,
OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material
breach of its terms and conditions.

7. Nothing in this License Agreement shall be deemed to create any
relationship of agency, partnership, or joint venture between PSF and
Licensee.  This License Agreement does not grant permission to use PSF
trademarks or trade name in a trademark sense to endorse or promote
products or services of Licensee, or any third party.

8. By copying, installing or otherwise using Python, Licensee
agrees to be bound by the terms and conditions of this License
Agreement.


BEOPEN.COM LICENSE AGREEMENT FOR PYTHON 2.0
-------------------------------------------

BEOPEN PYTHON OPEN SOURCE LICENSE AGREEMENT VERSION 1

1. This LICENSE AGREEMENT is between BeOpen.com ("BeOpen"), having an
office at 160 Saratoga Avenue, Santa Clara, CA 95051, and the
Individual or Organization ("Licensee") accessing and otherwise using
this software in source or binary form and its associated
documentation ("the Software").

2. Subject to the terms and conditions of this BeOpen Python License
Agreement, BeOpen hereby grants Licensee a non-exclusive,
royalty-free, world-wide license to reproduce, analyze, test, perform
and/or display publicly, prepare derivative works, distribute, and
otherwise use the Software alone or in any derivative version,
provided, however, that the BeOpen Python License is retained in the
Software, alone or in any derivative version prepared by Licensee.

3. BeOpen is making the Software available to Licensee on an "AS IS"
basis.  BEOPEN MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, BEOPEN MAKES NO AND
DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS
FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF THE SOFTWARE WILL NOT
INFRINGE ANY THIRD PARTY RIGHTS.

4. BEOPEN SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF THE
SOFTWARE FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS
AS A RESULT OF USING, MODIFYING OR DISTRIBUTING THE SOFTWARE, OR ANY
DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

5. This License Agreement will automatically terminate upon a material
breach of its terms and conditions.

6. This License Agreement shall be governed by and interpreted in all
respects by the law of the State of California, excluding conflict of
law provisions.  Nothing in this License Agreement shall be deemed to
create any relationship of agency, partnership, or joint venture
between BeOpen and Licensee.  This License Agreement does not grant
permission to use BeOpen trademarks or trade names in a trademark
sense to endorse or promote products or services of Licensee, or any
third party.  As an exception, the "BeOpen Python" logos available at
http://www.pythonlabs.com/logos.html may be used according to the
permissions granted on that web page.

7. By copying, installing or otherwise using the software, Licensee
agrees to be bound by the terms and conditions of this License
Agreement.


CNRI LICENSE AGREEMENT FOR PYTHON 1.6.1
---------------------------------------

1. This LICENSE AGREEMENT is between the Corporation for National
Research Initiatives, having an office at 1895 Preston White Drive,
Reston, VA 20191 ("CNRI"), and the Individual or Organization
("Licensee") accessing and otherwise using Python 1.6.1 software in
source or binary form and its associated documentation.

2. Subject to the terms and conditions of this License Agreement, CNRI
hereby grants Licensee a nonexclusive, royalty-free, world-wide
license to reproduce, analyze, test, perform and/or display publicly,
prepare derivative works, distribute, and otherwise use Python 1.6.1
alone or in any derivative version, provided, however, that CNRI's
License Agreement and CNRI's notice of copyright, i.e., "Copyright (c)
1995-2001 Corporation for National Research Initiatives; All Rights
Reserved" are retained in Python 1.6.1 alone or in any derivative
version prepared by Licensee.  Alternately, in lieu of CNRI's License
Agreement, Licensee may substitute the following text (omitting the
quotes): "Python 1.6.1 is made available subject to the terms and
conditions in CNRI's License Agreement.  This Agreement together with
Python 1.6.1 may be located on the Internet using the following
unique, persistent identifier (known as a handle): 1895.22/1013.  This
Agreement may also be obtained from a proxy server on the Internet
using the following URL: http://hdl.handle.net/1895.22/1013".

3. In the event Licensee prepares a derivative work that is based on
or incorporates Python 1.6.1 or any part thereof, and wants to make
the derivative work available to others as provided herein, then
Licensee hereby agrees to include in any such work a brief summary of
the changes made to Python 1.6.1.

4. CNRI is making Python 1.6.1 available to Licensee on an "AS IS"
basis.  CNRI MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, CNRI MAKES NO AND
DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS
FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF PYTHON 1.6.1 WILL NOT
INFRINGE ANY THIRD PARTY RIGHTS.

5. CNRI SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF PYTHON
1.6.1 FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS
A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING PYTHON 1.6.1,
OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material
breach of its terms and conditions.

7. This License Agreement shall be governed by the federal
intellectual property law of the United States, including without
limitation the federal copyright law, and, to the extent such
U.S. federal law does not apply, by the law of the Commonwealth of
Virginia, excluding Virginia's conflict of law provisions.
Notwithstanding the foregoing, with regard to derivative works based
on Python 1.6.1 that incorporate non-separable material that was
previously distributed under the GNU General Public License (GPL), the
law of the Commonwealth of Virginia shall govern this License
Agreement only as to issues arising under or with respect to
Paragraphs 4, 5, and 7 of this License Agreement.  Nothing in this
License Agreement shall be deemed to create any relationship of
agency, partnership, or joint venture between CNRI and Licensee.  This
License Agreement does not grant permission to use CNRI trademarks or
trade name in a trademark sense to endorse or promote products or
services of Licensee, or any third party.

8. By clicking on the "ACCEPT" button where indicated, or by copying,
installing or otherwise using Python 1.6.1, Licensee agrees to be
bound by the terms and conditions of this License Agreement.

        ACCEPT


CWI LICENSE AGREEMENT FOR PYTHON 0.9.0 THROUGH 1.2
--------------------------------------------------

Copyright (c) 1991 - 1995, Stichting Mathematisch Centrum Amsterdam,
The Netherlands.  All rights reserved.

Permission to use, copy, modify, and distribute this software and its
documentation for any purpose and without fee is hereby granted,
provided that the above copyright notice appear in all copies and that
both that copyright notice and this permission notice appear in
supporting documentation, and that the name of Stichting Mathematisch
Centrum or CWI not be used in advertising or publicity pertaining to
distribution of the software without specific, written prior
permission.

STICHTING MATHEMATISCH CENTRUM DISCLAIMS ALL WARRANTIES WITH REGARD TO
THIS SOFTWARE, INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS, IN NO EVENT SHALL STICHTING MATHEMATISCH CENTRUM BE LIABLE
FOR ANY SPECIAL, INDIRECT OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT
OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

*/

export const NEGATION_TRIGGERS = [
  [
    "kann ausgeschlossen werden",
    "POST"
  ],
  [
    "aber",
    "CONJ"
  ],
  [
    "nicht zu sehen",
    "POST"
  ],
  [
    "nicht gehabt",
    "POST"
  ],
  [
    "hat kein",
    "PREN"
  ],
  [
    "hat keiner",
    "PREN"
  ],
  [
    "hatte keines",
    "PREN"
  ],
  [
    "hat keinen",
    "PREN"
  ],
  [
    "hat keine",
    "PREN"
  ],
  [
    "nicht gesehen",
    "POST"
  ],
  [
    "traf fuer sie nicht zu",
    "POST"
  ],
  [
    "traf fuer ihn nicht zu",
    "POST"
  ],
  [
    "traf nicht zu",
    "POST"
  ],
  [
    "traf fuer den Patienten nicht zu",
    "POST"
  ],
  [
    "trifft fuer sie nicht zu",
    "POST"
  ],
  [
    "trifft fuer ihn nicht zu",
    "POST"
  ],
  [
    "schloss sie davon aus",
    "POST"
  ],
  [
    "trifft nicht zu",
    "POST"
  ],
  [
    "trifft fuer den Patienten nicht zu",
    "POST"
  ],
  [
    "wurde ausgeschlossen",
    "POST"
  ],
  [
    "kann nicht in Betracht kommen",
    "POST"
  ],
  [
    "kann nicht in Frage kommen",
    "POST"
  ],
  [
    "es kann ausgeschlossen werden, dass",
    "PREN"
  ],
  [
    "kann man ausschliessen",
    "POST"
  ],
  [
    "existiert nicht",
    "POST"
  ],
  [
    "besteht nicht",
    "POST"
  ],
  [
    "nicht praesent",
    "POST"
  ],
  [
    "nicht vorhanden",
    "POST"
  ],
  [
    "traf auf sie nicht zu",
    "POST"
  ],
  [
    "traf fuer die Patientin nicht zu",
    "POST"
  ],
  [
    "trifft fuer die Patientin nicht zu",
    "POST"
  ],
  [
    "wurden ausgeschlossen",
    "POST"
  ],
  [
    "kann nicht",
    "PREN"
  ],
  [
    "verneinte",
    "PREN"
  ],
  [
    "verneint",
    "PREN"
  ],
  [
    "ohne",
    "PREN"
  ],
  [
    "negativ in Bezug auf",
    "PREN"
  ],
  [
    "entwickelte sich nie",
    "PREN"
  ],
  [
    "hatte nie",
    "PREN"
  ],
  [
    "als der Grund der",
    "CONJ"
  ],
  [
    "keinen Nachweis",
    "PREN"
  ],
  [
    "keine neue",
    "PREN"
  ],
  [
    "keine anderen",
    "PREN"
  ],
  [
    "hatte nicht",
    "PREN"
  ],
  [
    "Patient war nicht",
    "PREN"
  ],
  [
    "mit keinem",
    "PREN"
  ],
  [
    "kann man nicht",
    "PREN"
  ],
  [
    "ist nicht moeglich",
    "POST"
  ],
  [
    "bestritt",
    "PREN"
  ],
  [
    "bestreitet",
    "PREN"
  ],
  [
    "frei von",
    "PREN"
  ],
  [
    "entwickelte sich ueberhaupt nicht",
    "POST"
  ],
  [
    "entwickelte sich niemals",
    "POST"
  ],
  [
    "war niemals",
    "PREN"
  ],
  [
    "war nie",
    "PREN"
  ],
  [
    "hatte niemals",
    "PREN"
  ],
  [
    "als der Grund des",
    "CONJ"
  ],
  [
    "nein",
    "POST"
  ],
  [
    "keinen Anhaltspunkt",
    "PREN"
  ],
  [
    "keine Evidenz",
    "PREN"
  ],
  [
    "keinen Beweis",
    "PREN"
  ],
  [
    "keine Anzeichen",
    "PREN"
  ],
  [
    "hatte keinen",
    "PREN"
  ],
  [
    "keiner",
    "PREN"
  ],
  [
    "keinem",
    "PREN"
  ],
  [
    "keines",
    "PREN"
  ],
  [
    "keinen",
    "PREN"
  ],
  [
    "aufgeloest",
    "POST"
  ],
  [
    "entfernt",
    "POST"
  ],
  [
    "lehnte",
    "PREN"
  ],
  [
    "lehnt",
    "PREN"
  ],
  [
    "keine Ergebnisse, die",
    "PREN"
  ],
  [
    "nicht bekannt, dass sie",
    "POSP"
  ],
  [
    "auszuschliessen",
    "POST"
  ],
  [
    "kein Resultat, das darauf hinweist",
    "PREN"
  ],
  [
    "nicht bekannt, dass er",
    "POSP"
  ],
  [
    "nicht sehen",
    "POST"
  ],
  [
    "kann nicht sehen",
    "PREN"
  ],
  [
    "nicht sein",
    "POST"
  ],
  [
    "unwahrscheinlich",
    "POSP"
  ],
  [
    "unwahrscheinlich",
    "PREP"
  ],
  [
    "kann man nicht sehen",
    "POST"
  ],
  [
    "nicht wahrscheinlich",
    "POSP"
  ],
  [
    "bis auf",
    "CONJ"
  ],
  [
    "das Fehlen von",
    "PREN"
  ],
  [
    "nicht wahrscheinlich",
    "PREP"
  ],
  [
    "zeigt sich nicht",
    "POST"
  ],
  [
    "keine abnormale",
    "PSEU"
  ],
  [
    "keine Ursache fuer",
    "PSEU"
  ],
  [
    "keine Beschwerden ueber",
    "PREN"
  ],
  [
    "keinen Hinweis auf",
    "PREN"
  ],
  [
    "als der Grund von",
    "CONJ"
  ],
  [
    "keine signifikante",
    "PREN"
  ],
  [
    "kein Hinweis auf",
    "PREN"
  ],
  [
    "schaetzen nicht",
    "PREN"
  ],
  [
    "nicht in Verbindung zu bringen mit",
    "PREN"
  ],
  [
    "beschwert sich nicht ueber",
    "PREN"
  ],
  [
    "zeigt kein",
    "PREN"
  ],
  [
    "nicht das Gefuehl",
    "PREN"
  ],
  [
    "nicht bekannt",
    "PREN"
  ],
  [
    "zeigt keinen",
    "PREN"
  ],
  [
    "sehe kein",
    "PREN"
  ],
  [
    "sehe keinen",
    "PREN"
  ],
  [
    "sehe keines",
    "PREN"
  ],
  [
    "sehe keiner",
    "PREN"
  ],
  [
    "sehe keine",
    "PREN"
  ],
  [
    "eher",
    "PREP"
  ],
  [
    "ehesten",
    "PREP"
  ],
  [
    "Test auf",
    "PSEU"
  ],
  [
    "nicht auffaellig in Bezug auf",
    "PREN"
  ],
  [
    "ohne Angabe von",
    "PREN"
  ],
  [
    "ohne ein Anzeichen von",
    "PREN"
  ],
  [
    "des Fehlens von",
    "PREN"
  ],
  [
    "bestreiten",
    "PREN"
  ],
  [
    "zurueckweisen",
    "POST"
  ],
  [
    "als der zweite Grund der",
    "CONJ"
  ],
  [
    "keine unnormale",
    "PREN"
  ],
  [
    "keine untypische",
    "PREN"
  ],
  [
    "kein Grund fuer",
    "PREN"
  ],
  [
    "keine Einwaende gegen",
    "PREN"
  ],
  [
    "keine Klagen ueber",
    "PREN"
  ],
  [
    "kein Anzeichen fuer",
    "PREN"
  ],
  [
    "kein Nachweis fuer",
    "PREN"
  ],
  [
    "kein Anzeichen von",
    "PREN"
  ],
  [
    "keine Zeichen von",
    "PREN"
  ],
  [
    "als der zweite Grund des",
    "CONJ"
  ],
  [
    "kein signifikanter",
    "PREN"
  ],
  [
    "keinen signifikanten",
    "PSEU"
  ],
  [
    "keine Anzeichen fuer",
    "PREN"
  ],
  [
    "nicht verbunden mit",
    "PREN"
  ],
  [
    "keine Verbindung zu",
    "PREN"
  ],
  [
    "kein Zusammenhang mit",
    "PREN"
  ],
  [
    "beklagt sich nicht ueber",
    "PREN"
  ],
  [
    "beklagte sich nicht ueber",
    "PREN"
  ],
  [
    "beschwerte sich nicht ueber",
    "PREN"
  ],
  [
    "nicht angezeigt",
    "POST"
  ],
  [
    "fuehlt sich nicht",
    "PREN"
  ],
  [
    "keine Kenntnis ueber",
    "PREN"
  ],
  [
    "kein Wissen ueber",
    "PREN"
  ],
  [
    "weiss nicht",
    "POSP"
  ],
  [
    "wissen nicht",
    "POSP"
  ],
  [
    "weiss nicht, ob",
    "POSP"
  ],
  [
    "erkennen nicht",
    "PREN"
  ],
  [
    "finden nicht",
    "PREN"
  ],
  [
    "Untersuchung auf",
    "PREN"
  ],
  [
    "nicht auffaellig fuer",
    "PREN"
  ],
  [
    "spricht nicht fuer",
    "PREN"
  ],
  [
    "ohne Verdacht auf",
    "PREN"
  ],
  [
    "ohne Informationen zu",
    "PREN"
  ],
  [
    "ohne einen Hinweis auf",
    "PREN"
  ],
  [
    "ohne Anzeichen",
    "PREN"
  ],
  [
    "ohne einen Hinweis",
    "PREN"
  ],
  [
    "nicht sicher",
    "PREP"
  ],
  [
    "nicht sicher",
    "POSP"
  ],
  [
    "gramnegativ",
    "PSEU"
  ],
  [
    "als ein Grund der",
    "CONJ"
  ],
  [
    "als ein Grund des",
    "CONJ"
  ],
  [
    "als ein Grund fuer",
    "CONJ"
  ],
  [
    "keine verdaechtige Veraenderung",
    "PSEU"
  ],
  [
    "keine Ursache",
    "PSEU"
  ],
  [
    "keinen Abfluss",
    "PSEU"
  ],
  [
    "verlaengert sich nicht",
    "PSEU"
  ],
  [
    "nicht notwendigerweise",
    "PSEU"
  ],
  [
    "nicht nur",
    "PSEU"
  ],
  [
    "ohne Schwierigkeit",
    "PSEU"
  ],
  [
    "gram-negativ",
    "PSEU"
  ],
  [
    "gram-negatives",
    "PSEU"
  ],
  [
    "gram-negativer",
    "PSEU"
  ],
  [
    "gram-negativen",
    "PSEU"
  ],
  [
    "gram-negative",
    "PSEU"
  ],
  [
    "als ein Grund von",
    "CONJ"
  ],
  [
    "gramnegatives",
    "PSEU"
  ],
  [
    "gramnegativer",
    "PSEU"
  ],
  [
    "gramnegativen",
    "PSEU"
  ],
  [
    "keine definitive Veraenderung",
    "PSEU"
  ],
  [
    "keine definitiven Veraenderungen",
    "PSEU"
  ],
  [
    "keine eindeutigen Veraenderungen",
    "PSEU"
  ],
  [
    "keine definitive Aenderung",
    "PSEU"
  ],
  [
    "keine definitiven Aenderungen",
    "PSEU"
  ],
  [
    "als ein zweiter Grund der",
    "CONJ"
  ],
  [
    "keine eindeutigen Aenderungen",
    "PSEU"
  ],
  [
    "als ein zweiter Grund des",
    "CONJ"
  ],
  [
    "keine Veraenderungen",
    "PSEU"
  ],
  [
    "keine Aenderungen",
    "PSEU"
  ],
  [
    "keiner definitiven Veraenderung",
    "PSEU"
  ],
  [
    "keiner definitiven Veraenderungen",
    "PSEU"
  ],
  [
    "keiner eindeutigen Veraenderung",
    "PSEU"
  ],
  [
    "keiner eindeutigen Veraenderungen",
    "PSEU"
  ],
  [
    "keiner definitiven Aenderung",
    "PSEU"
  ],
  [
    "keiner definitiven Aenderungen",
    "PSEU"
  ],
  [
    "keiner eindeutigen Aenderung",
    "PSEU"
  ],
  [
    "keiner eindeutigen Aenderungen",
    "PSEU"
  ],
  [
    "keiner Veraenderung",
    "PSEU"
  ],
  [
    "keiner Aenderung",
    "PSEU"
  ],
  [
    "keiner Veraenderungen",
    "PSEU"
  ],
  [
    "keiner Aenderungen",
    "PSEU"
  ],
  [
    "kein Wechsel",
    "PSEU"
  ],
  [
    "als ein zweiter Grund fuer",
    "CONJ"
  ],
  [
    "keiner Zunahme",
    "PSEU"
  ],
  [
    "keine Zunahmen",
    "PSEU"
  ],
  [
    "als ein zweiter Grund von",
    "CONJ"
  ],
  [
    "keines Anstiegs",
    "PSEU"
  ],
  [
    "keinem Anstieg",
    "PSEU"
  ],
  [
    "keinen Anstieg",
    "PSEU"
  ],
  [
    "keine Erhoehung",
    "PSEU"
  ],
  [
    "keiner Erhoehung",
    "PSEU"
  ],
  [
    "keine Steigerung",
    "PSEU"
  ],
  [
    "als eine Quelle der",
    "CONJ"
  ],
  [
    "keiner Auffaelligkeit",
    "PSEU"
  ],
  [
    "als eine Quelle des",
    "CONJ"
  ],
  [
    "kein signifikanter Wechsel",
    "PSEU"
  ],
  [
    "keine Auffaelligkeiten",
    "PSEU"
  ],
  [
    "als eine Quelle fuer",
    "CONJ"
  ],
  [
    "keiner signifikanten Aenderung",
    "PSEU"
  ],
  [
    "als eine Quelle von",
    "CONJ"
  ],
  [
    "keiner signifikanten Veraenderung",
    "PSEU"
  ],
  [
    "keine deutliche Aenderung",
    "PSEU"
  ],
  [
    "keiner deutlichen Aenderung",
    "PSEU"
  ],
  [
    "keiner deutlichen Veraenderung",
    "PSEU"
  ],
  [
    "keine wesentliche Aenderung",
    "PSEU"
  ],
  [
    "keiner wesentlichen Aenderung",
    "PSEU"
  ],
  [
    "keine wesentliche Veraenderung",
    "PSEU"
  ],
  [
    "keiner wesentlichen Veraenderung",
    "PSEU"
  ],
  [
    "keine massgebliche Aenderung",
    "PSEU"
  ],
  [
    "keiner massgeblichen Aenderung",
    "PSEU"
  ],
  [
    "keine massgebliche Veraenderung",
    "PSEU"
  ],
  [
    "keiner massgeblichen Veraenderung",
    "PSEU"
  ],
  [
    "als Grund der",
    "CONJ"
  ],
  [
    "keines signifikanten Intervallwechsels",
    "PSEU"
  ],
  [
    "keinem signifikanten Intervallwechsel",
    "PSEU"
  ],
  [
    "keinen signifikanten Intervallwechsel",
    "PSEU"
  ],
  [
    "keines deutlichen Intervallwechsels",
    "PSEU"
  ],
  [
    "keinem deutlichen Intervallwechsel",
    "PSEU"
  ],
  [
    "keinen deutlichen Intervallwechsel",
    "PSEU"
  ],
  [
    "kein wesentlicher Intervallwechsel",
    "PSEU"
  ],
  [
    "keines wesentlichen Intervallwechsels",
    "PSEU"
  ],
  [
    "keinem wesentlichen Intervallwechsel",
    "PSEU"
  ],
  [
    "keinen wesentlichen Intervallwechsel",
    "PSEU"
  ],
  [
    "kein massgeblicher Intervallwechsel",
    "PSEU"
  ],
  [
    "keines massgeblichen Intervallwechsels",
    "PSEU"
  ],
  [
    "keinem massgeblichen Intervallwechsel",
    "PSEU"
  ],
  [
    "keinen massgeblichen Intervallwechsel",
    "PSEU"
  ],
  [
    "als Grund des",
    "CONJ"
  ],
  [
    "verursacht keine",
    "PSEU"
  ],
  [
    "fliesst nicht",
    "PSEU"
  ],
  [
    "nicht verlaengert",
    "PSEU"
  ],
  [
    "nicht ausgedehnt",
    "PSEU"
  ],
  [
    "keine Verlaengerung",
    "PSEU"
  ],
  [
    "keiner Verlaengerung",
    "PSEU"
  ],
  [
    "nicht unbedingt",
    "POSP"
  ],
  [
    "nicht zwangslaeufig",
    "POSP"
  ],
  [
    "nicht ausschliesslich",
    "PSEU"
  ],
  [
    "ohne Schwierigkeiten",
    "PSEU"
  ],
  [
    "problemlose",
    "PSEU"
  ],
  [
    "problemloses",
    "PSEU"
  ],
  [
    "problemloser",
    "PSEU"
  ],
  [
    "problemlosen",
    "PSEU"
  ],
  [
    "problemlos",
    "PSEU"
  ],
  [
    "ohne Probleme",
    "PSEU"
  ],
  [
    "als Grund fuer",
    "CONJ"
  ],
  [
    "als Ursache fuer",
    "CONJ"
  ],
  [
    "als Ursache von",
    "CONJ"
  ],
  [
    "als Grund von",
    "CONJ"
  ],
  [
    "als zweite Ursache fuer",
    "CONJ"
  ],
  [
    "als zweite Ursache von",
    "CONJ"
  ],
  [
    "als zweite Krankheitsursache fuer",
    "CONJ"
  ],
  [
    "als zweite Krankheitsursache von",
    "CONJ"
  ],
  [
    "als zweiter Ausgangspunkt fuer",
    "CONJ"
  ],
  [
    "als zweiter Ausgangspunkt von",
    "CONJ"
  ],
  [
    "als Nebeneffekt der",
    "CONJ"
  ],
  [
    "als zweiter Anlass fuer",
    "CONJ"
  ],
  [
    "als zweiter Anlass von",
    "CONJ"
  ],
  [
    "als Nebeneffekt des",
    "CONJ"
  ],
  [
    "als eine Ursache fuer",
    "CONJ"
  ],
  [
    "als eine Ursache von",
    "CONJ"
  ],
  [
    "als eine Krankheitsursache fuer",
    "CONJ"
  ],
  [
    "als eine Aetiologie fuer",
    "CONJ"
  ],
  [
    "als eine Krankheitsursache von",
    "CONJ"
  ],
  [
    "als eine Aetiologie von",
    "CONJ"
  ],
  [
    "als ein Ausgangspunkt fuer",
    "CONJ"
  ],
  [
    "als ein Ausgangspunkt von",
    "CONJ"
  ],
  [
    "als Nebeneffekt fuer",
    "CONJ"
  ],
  [
    "als eine zweite Ursache fuer",
    "CONJ"
  ],
  [
    "als eine zweite Ursache von",
    "CONJ"
  ],
  [
    "als eine zweite Krankheitsursache fuer",
    "CONJ"
  ],
  [
    "als eine zweite Krankheitsursache von",
    "CONJ"
  ],
  [
    "als ein zweiter Ausgangspunkt fuer",
    "CONJ"
  ],
  [
    "als ein zweiter Ausgangspunkt von",
    "CONJ"
  ],
  [
    "als Nebeneffekt von",
    "CONJ"
  ],
  [
    "als eine zweite Quelle fuer",
    "CONJ"
  ],
  [
    "als eine zweite Quelle von",
    "CONJ"
  ],
  [
    "als zweiter Grund der",
    "CONJ"
  ],
  [
    "als die Ursache fuer",
    "CONJ"
  ],
  [
    "als die Ursache von",
    "CONJ"
  ],
  [
    "als die Krankheitsursache fuer",
    "CONJ"
  ],
  [
    "als die Krankheitsursache von",
    "CONJ"
  ],
  [
    "als der Ausgangspunkt fuer",
    "CONJ"
  ],
  [
    "als der Ausgangspunkt von",
    "CONJ"
  ],
  [
    "als der Grund fuer",
    "CONJ"
  ],
  [
    "als die zweite Ursache fuer",
    "CONJ"
  ],
  [
    "als die zweite Ursache von",
    "CONJ"
  ],
  [
    "als die zweite Krankheitsursache fuer",
    "CONJ"
  ],
  [
    "als die zweite Krankheitsursache von",
    "CONJ"
  ],
  [
    "als der zweite Ausgangspunkt fuer",
    "CONJ"
  ],
  [
    "als der zweite Ausgangspunkt von",
    "CONJ"
  ],
  [
    "als der zweite Grund fuer",
    "CONJ"
  ],
  [
    "als der zweite Grund von",
    "CONJ"
  ],
  [
    "als die zweite Quelle fuer",
    "CONJ"
  ],
  [
    "als die zweite Quelle von",
    "CONJ"
  ],
  [
    "als die Quelle fuer",
    "CONJ"
  ],
  [
    "als die Quelle von",
    "CONJ"
  ],
  [
    "abgesehen von",
    "CONJ"
  ],
  [
    "als zweiter Grund des",
    "CONJ"
  ],
  [
    "noch",
    "PSEU"
  ],
  [
    "wenngleich",
    "CONJ"
  ],
  [
    "obgleich",
    "CONJ"
  ],
  [
    "wenn auch",
    "CONJ"
  ],
  [
    "ausser dass",
    "CONJ"
  ],
  [
    "als zweiter Grund fuer",
    "CONJ"
  ],
  [
    "mit Ausnahme davon",
    "CONJ"
  ],
  [
    "als Ursache der",
    "CONJ"
  ],
  [
    "als Ursache des",
    "CONJ"
  ],
  [
    "als Ursache dieser",
    "CONJ"
  ],
  [
    "als Ursache dieses",
    "CONJ"
  ],
  [
    "als Quelle der",
    "CONJ"
  ],
  [
    "als Quelle des",
    "CONJ"
  ],
  [
    "als Quelle dieser",
    "CONJ"
  ],
  [
    "als Quelle dieses",
    "CONJ"
  ],
  [
    "als Quelle von",
    "CONJ"
  ],
  [
    "als Quelle fuer",
    "CONJ"
  ],
  [
    "als Aetiologie der",
    "CONJ"
  ],
  [
    "als Aetiologie des",
    "CONJ"
  ],
  [
    "als Aetiologie dieser",
    "CONJ"
  ],
  [
    "als Aetiologie dieses",
    "CONJ"
  ],
  [
    "als Aetiologie von",
    "CONJ"
  ],
  [
    "als Aetiologie fuer",
    "CONJ"
  ],
  [
    "als Ausgangspunkt der",
    "CONJ"
  ],
  [
    "als Ausgangspunkt des",
    "CONJ"
  ],
  [
    "als Ausgangspunkt dieser",
    "CONJ"
  ],
  [
    "als Ausgangspunkt dieses",
    "CONJ"
  ],
  [
    "als Ausgangspunkt von",
    "CONJ"
  ],
  [
    "als Ausgangspunkt fuer",
    "CONJ"
  ],
  [
    "als Krankheitsursache der",
    "CONJ"
  ],
  [
    "als Krankheitsursache des",
    "CONJ"
  ],
  [
    "als Krankheitsursache dieser",
    "CONJ"
  ],
  [
    "als Krankheitsursache dieses",
    "CONJ"
  ],
  [
    "als Krankheitsursache von",
    "CONJ"
  ],
  [
    "als Krankheitsursache fuer",
    "CONJ"
  ],
  [
    "als Nebeneffekt von",
    "CONJ"
  ],
  [
    "als zweiter Grund von",
    "CONJ"
  ],
  [
    "als zweite Krankheitsursache der",
    "CONJ"
  ],
  [
    "als zweite Krankheitsursache des",
    "CONJ"
  ],
  [
    "als zweiter Ursprung fuer",
    "CONJ"
  ],
  [
    "als zweiter Ursprung von",
    "CONJ"
  ],
  [
    "als zweiter Ursprung der",
    "CONJ"
  ],
  [
    "als zweiter Ursprung des",
    "CONJ"
  ],
  [
    "ausser",
    "CONJ"
  ],
  [
    "dennoch",
    "CONJ"
  ],
  [
    "gramnegative",
    "PSEU"
  ],
  [
    "ist nicht vorhanden",
    "POST"
  ],
  [
    "jedoch",
    "CONJ"
  ],
  [
    "kein",
    "PREN"
  ],
  [
    "kein Anstieg",
    "PSEU"
  ],
  [
    "als eine Ursache der",
    "CONJ"
  ],
  [
    "als eine Ursache des",
    "CONJ"
  ],
  [
    "als eine Krankheitsursache der",
    "CONJ"
  ],
  [
    "als eine Krankheitsursache des",
    "CONJ"
  ],
  [
    "als eine Aetiologie der",
    "CONJ"
  ],
  [
    "als eine Aetiologie des",
    "CONJ"
  ],
  [
    "als ein Ausgangspunkt der",
    "CONJ"
  ],
  [
    "als ein Ausgangspunkt des",
    "CONJ"
  ],
  [
    "als ein Ursprung von",
    "CONJ"
  ],
  [
    "als ein Ursprung der",
    "CONJ"
  ],
  [
    "als ein Ursprung des",
    "CONJ"
  ],
  [
    "kein deutlicher Intervallwechsel",
    "PSEU"
  ],
  [
    "kein signifikanter Intervallwechsel",
    "PSEU"
  ],
  [
    "als eine Nebenursache fuer",
    "CONJ"
  ],
  [
    "als eine Nebenursache der",
    "CONJ"
  ],
  [
    "als eine Nebenursache des",
    "CONJ"
  ],
  [
    "als eine Nebenursache dieser",
    "CONJ"
  ],
  [
    "als eine Nebenursache dieses",
    "CONJ"
  ],
  [
    "als eine Nebenursache von",
    "CONJ"
  ],
  [
    "als die Nebenursache fuer",
    "CONJ"
  ],
  [
    "als die Nebenursache der",
    "CONJ"
  ],
  [
    "als die Nebenursache des",
    "CONJ"
  ],
  [
    "als die Nebenursache dieser",
    "CONJ"
  ],
  [
    "als die Nebenursache dieses",
    "CONJ"
  ],
  [
    "als die Nebenursache von",
    "CONJ"
  ],
  [
    "als Nebenursache fuer",
    "CONJ"
  ],
  [
    "als Nebenursache der",
    "CONJ"
  ],
  [
    "als Nebenursache des",
    "CONJ"
  ],
  [
    "als Nebenursache dieser",
    "CONJ"
  ],
  [
    "als Nebenursache dieses",
    "CONJ"
  ],
  [
    "als Nebenursache von",
    "CONJ"
  ],
  [
    "als Nebenursachen fuer",
    "CONJ"
  ],
  [
    "als Nebenursachen der",
    "CONJ"
  ],
  [
    "als Nebenursachen des",
    "CONJ"
  ],
  [
    "als Nebenursachen dieser",
    "CONJ"
  ],
  [
    "als Nebenursachen dieses",
    "CONJ"
  ],
  [
    "als Nebenursachen von",
    "CONJ"
  ],
  [
    "als ein Nebengrund fuer",
    "CONJ"
  ],
  [
    "als ein Nebengrund der",
    "CONJ"
  ],
  [
    "als ein Nebengrund des",
    "CONJ"
  ],
  [
    "als ein Nebengrund dieser",
    "CONJ"
  ],
  [
    "als ein Nebengrund dieses",
    "CONJ"
  ],
  [
    "als ein Nebengrund von",
    "CONJ"
  ],
  [
    "als die Nebengrund fuer",
    "CONJ"
  ],
  [
    "als die Nebengrund der",
    "CONJ"
  ],
  [
    "als die Nebengrund des",
    "CONJ"
  ],
  [
    "als die Nebengrund dieser",
    "CONJ"
  ],
  [
    "als die Nebengrund dieses",
    "CONJ"
  ],
  [
    "als die Nebengrund von",
    "CONJ"
  ],
  [
    "als Nebengrund fuer",
    "CONJ"
  ],
  [
    "als Nebengrund der",
    "CONJ"
  ],
  [
    "als Nebengrund des",
    "CONJ"
  ],
  [
    "als Nebengrund dieser",
    "CONJ"
  ],
  [
    "als Nebengrund dieses",
    "CONJ"
  ],
  [
    "als Nebengrund von",
    "CONJ"
  ],
  [
    "als Nebengruende fuer",
    "CONJ"
  ],
  [
    "als Nebengruende der",
    "CONJ"
  ],
  [
    "als Nebengruende des",
    "CONJ"
  ],
  [
    "als Nebengruende dieser",
    "CONJ"
  ],
  [
    "als Nebengruende dieses",
    "CONJ"
  ],
  [
    "als Nebengruende von",
    "CONJ"
  ],
  [
    "kein Zeichen von",
    "PREN"
  ],
  [
    "als eine zweite Krankheitsursache der/des",
    "CONJ"
  ],
  [
    "als ein zweiter Ursprung fuer",
    "CONJ"
  ],
  [
    "als ein zweiter Ursprung von",
    "CONJ"
  ],
  [
    "als ein zweiter Ursprung der",
    "CONJ"
  ],
  [
    "als ein zweiter Ursprung des",
    "CONJ"
  ],
  [
    "keine Aenderung",
    "PSEU"
  ],
  [
    "keine Anzeichen von",
    "PREN"
  ],
  [
    "keine Auffaelligkeit",
    "PSEU"
  ],
  [
    "keine deutliche Veraenderung",
    "PSEU"
  ],
  [
    "keine eindeutige Aenderung",
    "PSEU"
  ],
  [
    "keine eindeutige Veraenderung",
    "PSEU"
  ],
  [
    "als der Grund dieser",
    "CONJ"
  ],
  [
    "als der Grund dieses",
    "CONJ"
  ],
  [
    "keine signifikante Aenderung",
    "PSEU"
  ],
  [
    "als Grund dieser",
    "CONJ"
  ],
  [
    "als Grund dieses",
    "CONJ"
  ],
  [
    "als der Anlass der",
    "CONJ"
  ],
  [
    "als der Anlass des",
    "CONJ"
  ],
  [
    "als der Anlass dieser",
    "CONJ"
  ],
  [
    "als der Anlass dieses",
    "CONJ"
  ],
  [
    "als der Anlass fuer",
    "CONJ"
  ],
  [
    "als der Anlass von",
    "CONJ"
  ],
  [
    "als Anlass der",
    "CONJ"
  ],
  [
    "als Anlass des",
    "CONJ"
  ],
  [
    "als Anlass dieser",
    "CONJ"
  ],
  [
    "als Anlass dieses",
    "CONJ"
  ],
  [
    "als Anlass von",
    "CONJ"
  ],
  [
    "als Anlass fuer",
    "CONJ"
  ],
  [
    "als die Ursache dieser",
    "CONJ"
  ],
  [
    "als die Ursache dieses",
    "CONJ"
  ],
  [
    "als die Aetiologie der",
    "CONJ"
  ],
  [
    "als die Aetiologie des",
    "CONJ"
  ],
  [
    "als die Aetiologie dieser",
    "CONJ"
  ],
  [
    "als die Aetiologie dieses",
    "CONJ"
  ],
  [
    "als die Aetiologie von",
    "CONJ"
  ],
  [
    "als die Aetiologie fuer",
    "CONJ"
  ],
  [
    "als die Krankheitsursache dieser",
    "CONJ"
  ],
  [
    "als die Krankheitsursache dieses",
    "CONJ"
  ],
  [
    "als die Quelle dieser",
    "CONJ"
  ],
  [
    "als die Quelle dieses",
    "CONJ"
  ],
  [
    "als der Ausgangspunkt dieser",
    "CONJ"
  ],
  [
    "als der Ausgangspunkt dieses",
    "CONJ"
  ],
  [
    "als die Ursache der",
    "CONJ"
  ],
  [
    "als die Ursache des",
    "CONJ"
  ],
  [
    "als die Krankheitsursache der",
    "CONJ"
  ],
  [
    "als die Krankheitsursache des",
    "CONJ"
  ],
  [
    "als der Ausgangspunkt der",
    "CONJ"
  ],
  [
    "als der Ausgangspunkt des",
    "CONJ"
  ],
  [
    "keine signifikante Veraenderung",
    "PSEU"
  ],
  [
    "als Nebeneffekt fuer",
    "CONJ"
  ],
  [
    "als die zweite Krankheitsursache der",
    "CONJ"
  ],
  [
    "als die zweite Krankheitsursache des",
    "CONJ"
  ],
  [
    "als der zweite Ursprung fuer",
    "CONJ"
  ],
  [
    "als der zweite Ursprung von",
    "CONJ"
  ],
  [
    "als der zweite Ursprung der",
    "CONJ"
  ],
  [
    "als der zweite Ursprung des",
    "CONJ"
  ],
  [
    "keine Veraenderung",
    "PSEU"
  ],
  [
    "als der zweite Grund fuer",
    "CONJ"
  ],
  [
    "als der zweite Grund von",
    "CONJ"
  ],
  [
    "keine Zunahme",
    "PSEU"
  ],
  [
    "kommt nicht zum Vorschein",
    "POST"
  ],
  [
    "nicht",
    "PREN"
  ],
  [
    "als die Quelle der",
    "CONJ"
  ],
  [
    "als die Quelle des",
    "CONJ"
  ],
  [
    "abgesehen davon",
    "CONJ"
  ],
  [
    "obwohl",
    "CONJ"
  ],
  [
    "unabhaengig davon",
    "CONJ"
  ],
  [
    "mit Ausnahme von",
    "CONJ"
  ],
  [
    "unabhaengig von",
    "CONJ"
  ],
  [
    "allerdings",
    "CONJ"
  ],
  [
    "trotzdem",
    "CONJ"
  ],
  [
    "immer noch",
    "CONJ"
  ],
  [
    "schon",
    "CONJ"
  ],
  [
    "jetzt noch",
    "CONJ"
  ],
  [
    "noch immer",
    "CONJ"
  ],
  [
    "unsicher",
    "PREP"
  ],
  [
    "unsicher",
    "POSP"
  ],
  [
    "verneint",
    "POST"
  ],
  [
    "verneinte",
    "PREP"
  ],
  [
    "keine",
    "PREN"
  ],
  [
    "nicht bekannt",
    "POSN"
  ],
  [
    "\\?",
    "POSP"
  ],
  [
    "scheint",
    "PREP"
  ],
  [
    "scheinbar",
    "PREP"
  ],
  [
    "verdacht",
    "PREP"
  ],
  [
    "hinweis",
    "PREP"
  ],
  [
    "kann es sich um",
    "PREP"
  ]
] as const;
