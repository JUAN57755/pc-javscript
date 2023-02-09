## PCjs Disk Images

PCjs v2 (version 2.x) disk images are JSON objects with the following properties:

  - *imageInfo*: an object describing the type of disk (eg, "CHS") and other characteristics
  - *volTable*: an array of VolInfo objects, one for each logical FAT volume on the disk (optional)
  - *fileTable*: an array of FileInfo objects, one for each file across all FAT volumes on the disk (optional)
  - *diskData*: an array of sector data; for CHS disk images, the data is organized as an array of sectors within an array of heads within an array of cylinders

For example, take a look at this [PC DOS 2.00 diskette](https://diskettes.pcjs.org/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json).

Older PCjs v1 (version 1.x) disk images were basically just an array of CHS sector data (what is now called the *diskData* object),
without any other information.  Such disk images are still supported, but all the disk images now stored on PCjs disk servers,
such as [diskettes.pcjs.org](https://diskettes.pcjs.org), have been converted to the v2 format.

## PCjs DiskImage Utility

[DiskImage](modules/diskimage.js) is a Node command-line application that reads/writes PCjs v2 disk images,
using the [DiskInfo](../machines/pcx86/modules/diskinfo.js) PCx86 machine module to parse the data.
[DiskImage](modules/diskimage.js) supersedes the older PCjs v1 [DiskDump](old/diskdump/lib/diskdump.js) utility.

## Building PCjs Disk Images from IMG files

To build a PCjs disk image, such as this [PC DOS 2.00 diskette](https://diskettes.pcjs.org/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json),
from an IMG file:

    node modules/diskimage.js /diskettes/pcx86/sys/dos/2.00/PCDOS200-DISK1.img PCDOS200-DISK1.json

In addition to IMG files, DiskImage also includes (experimental) support for PSI (PCE Sector Image) files, which can in
turn be built from Kryoflux RAW files.  Here are the basic steps, using tools from [PCE](http://www.hampa.ch/pce/):

 1. From the Kryoflux RAW files, create a PFI ("PCE Flux Image") file
 2. Next, create a PRI ("PCE Raw Image") file, with the flux reversal pulses converted to bits
 3. From the PRI file, create a PSI ("PCE Sector Image") file
 4. From the PSI file, create a JSON-encoded disk image file, using the PCjs `DiskImage` utility

which translates to these commands (using a 360K PC diskette named "disk1" as an example):

    pfi disk1.00.0.raw disk1.pfi
    pfi disk1.pfi -p double-step -r 600000 -p decode pri disk1.pri
    pri disk1.pri -c 40-99 -p delete disk1.pri
    pri disk1.pri -p decode mfm disk1.psi
    node modules/diskimage.js disk1.psi disk1.json

## Building PCjs Disk Images from Directories

To build a [VisiCalc diskette](https://miscdisks.pcjs.org/pcx86/app/other/visicalc/1981/VISICALC-1981.json)
from a directory containing VC.COM, specify the name of the directory, including a trailing slash, like so:

    node modules/diskimage.js /miscdisks/pcx86/app/other/visicalc/1981/VISICALC-1981/ VISICALC-1981.json

By default, the diskette will be given an 11-character volume label derived from the directory name (eg, "VISICALC-19");
however, you can use `--label` to specify your own label (eg, `--label=VISICALC81`), or use `--label=none` to suppress
the volume label.

The smallest standard PC diskette format that can accommodate all the files will be automatically selected, but you can
specify a different target size (in Kb) using `--target=N`, where N is 160, 180, 320, 360, 720, 1200, or 1440.  For
example, if your diskette *must* work with PC DOS 1.0, use `--target=160`.

Another useful option is `--normalize`, which will transform the line-endings in all recognized text files from LF to CR/LF;
a recognized text file is any file ending with one of these extensions (.md, .me, .bas, .bat, .asm, .lrf, .mak, .txt, or .xml)
AND which contains only 7-bit ASCII characters -- since some files, like .bas files, can contain either ASCII or non-ASCII
data.  The list of recognized text file extensions is likely to grow over time.

## Examining PCjs Disk Images

Both local and remote diskette images can be examined.  To examine a remote image, you *must* use the `--disk` option,
with either an explicit URL, as in:

    node modules/diskimage.js --disk https://diskettes.pcjs.org/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json

or with one of PCjs' implicit diskette paths, such as `/diskettes`, which currently maps to disk server `https://diskettes.pcjs.org`:

    node modules/diskimage.js --disk /diskettes/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json

If you happen to have a local file that exists in the same location as the implicit diskette path, use `--server` to force
the server mapping.  The list of implicit paths for PC diskettes currently includes:

  - [/diskettes](https://github.com/jeffpar/pcjs-diskettes)
  - [/gamedisks](https://github.com/jeffpar/pcjs-gamedisks)
  - [/miscdisks](https://github.com/jeffpar/pcjs-miscdisks)
  - [/pcsig8a-disks](https://github.com/jeffpar/pcjs-pcsig8a-disks)
  - [/pcsig8b-disks](https://github.com/jeffpar/pcjs-pcsig8b-disks)
  - [/harddisks](https://github.com/jeffpar/pcjs-harddisks)

## Commonly Used DiskImage Options

To get a DOS-compatible directory listing of a disk image:

    node modules/diskimage.js /diskettes/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json --list

To display all the unused bytes of a disk image:

    node modules/diskimage.js /diskettes/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json --list=unused

NOTE: Unused bytes are a superset of free bytes.  Free bytes are always measured in terms of unused clusters,
multiplied by the cluster size, whereas unused bytes are the combination of all completely unused cluster space *plus* any partially
unused cluster space.  Being able to see all the unused bytes on a disk can be useful for studying disk image usage, or simply making
sure that a disk is free of any unwanted data.

TODO: Update the unused byte report to include unused bytes, if any, in all FAT sectors and directory sectors.

To extract all the files from a disk image:

    node modules/diskimage.js /diskettes/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json --extract

To extract a specific file from a disk image:

    node modules/diskimage.js /diskettes/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json --extract=COMMAND.COM

To dump a specific (C:H:S) sector from a disk image:

    node modules/diskimage.js /diskettes/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json --dump=0:0:1

To dump multiple (C:H:S) sectors from a disk image track, follow the C:H:S values with a sector count; eg:

    node modules/diskimage.js /diskettes/pcx86/sys/dos/ibm/2.00/PCDOS200-DISK1.json --dump=0:0:1:4
