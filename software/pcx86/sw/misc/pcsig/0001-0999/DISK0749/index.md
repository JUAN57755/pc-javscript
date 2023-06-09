---
layout: page
title: "PC-SIG Diskette Library (Disk #749)"
permalink: /software/pcx86/sw/misc/pcsig/0001-0999/DISK0749/
machines:
  - id: ibm5170
    type: pcx86
    config: /machines/pcx86/ibm/5170/cga/1024kb/rev3/machine.xml
    diskettes: /machines/pcx86/diskettes.json,/disks/pcsigdisks/pcx86/diskettes.json
    autoGen: true
    autoMount:
      B: "PC-SIG Library Disk #0749"
    autoType: $date\r$time\rB:\rDIR\r
---

{% include machine.html id="ibm5170" %}

{% comment %}info_begin{% endcomment %}

## Information about "QUANTOIDS, RESCUE, & LOTTERY FUN"

    To the Spaceport!  If we don't hunt these madmen down, they'll destroy
    life as we know it today!
    
    (C'mon, admit it. Would you want your daughter to marry an accountant
    or... Heaven forbid... an MBA?!  Do you want your grandchildren
    calculating ROI?! Aha, I thought not!)
    
    We must fight together and track down the QUANTOIDS OF NEBULOUS IV!!
    
    You find yourself looking out the cockpit of your spacecraft while
    controlling ship maneuvers, varying your speed and firing at the enemy
    ships, filled with those nefarious bean-counters intent on enslaving
    us!
    
    Look out! They have COMPUTERS!!
    
    Keep track of all the winning numbers and numbers you have bet in "6/49"
    lottery games.  Get a list whenever you need it. Source code included
    for the tinkerer.
    
    A variation on the classic "Lunar Lander" theme.
    
    Launch from Earth, maneuver your ship to dock with a space station,
    transfer the crew, return and land, preferably safely, on Earth again.
    
    There are only a few commands to learn, which is good.  You're not going
    to have a lot of time for practice.  You'll be too busy trying to stay
    alive.  Heads up!
{% comment %}info_end{% endcomment %}

{% comment %}samples_begin{% endcomment %}

## FILES749.TXT

{% raw %}
```
---------------------------------------------------------------------------
Disk No  749  QUANTOIDS / SPACE RESCUE / LOTTERY FUN                 v1
---------------------------------------------------------------------------
Quantoids of Nebulous IV is a game where you must seek and destroy enemy
Quantoid ships, which are files with graduates of various business schools
who seek to infect the universe with their unimaginative MBA quantitative
methods. The monitor shows you looking out of the cockpit of your
spaceship, and you have various controls to maneuver, change your speed,
and fire at enemy ships. There is a shield that will protect your ship from
a certain amount of hits, after which it will be destroyed. This program
requires a lot of skill to master this game. The documentation for the
program is shown within the main program itself.
 
LOTTERY FUN is a program for maintaining a list (or multiple lists) of 'LOTTO
6/40' tickets.  Ticket numbers can be generated by the program or entered
manually.  Winning numbers can be entered and compared against tickets in your
data file.  Lottery Fun will run on any PC or compatable with a CGA (color
graphics adapter) and one disk drive.  Turbo pascal source code is also
included for those who like to tinker with such things.
 
Space Rescue is a variation on the "Lunar Lander" theme.  You must launch
from earth, maneuver your ship to dock with a space station, transfer the
space station crew, and return and make a safe landing on earth.  When you
dock with the space station or return to earth you must approach at a
reasonable angle or you will crash (there are a number of different messages
for both failures and successes).  Your score (if you survive) depends on
how well you conserve time and fuel.
 
It has very few commands to learn (Launch, Rotate, Fire engine, draw shape
of Orbit, and change parameter Display), which makes it easy to learn, but
not necessarily easy to master.
 
RESCUE   COM  Main program
README   RES  Short notes on Space Rescue
------------
LOTTERY  PAS   Pascal source code for lottery fun
LOTTERY  DOC   Documentation file (10 pages)
LOTTERY  COM   Main program for lottery fun
DATA1    LFD   Example data file
DATA2    LFD    "
-------  ---
QUANTOID EXE  Main program
ORDER    EXE  Prints out order form
 
PC-SIG
1030D E Duane Avenue
Sunnyvale Ca. 94086
(408) 730-9291
(c) Copyright 1987 PC-SIG
```
{% endraw %}

## LOTTERY.DOC

{% raw %}
```






                              PROGRAM INSTRUCTIONS

                           LOTTERY FUN, VERSION 1.003

                                  NOVEMBER 1986


                        >>>>>>>>>> DISCLAIMER <<<<<<<<<<

             THE PROGRAM "LOTTERY FUN" IS DESIGNED TO BE USED FOR 
        ENTERTAINMENT.  THE AUTHOR RESERVES THE RIGHT TO MAKE UNANNOUNCED 
        AND/OR UNDOCUMENTED CHANGES TO THE PROGRAM AT ANY TIME.  NO 
        WARRANTY AS TO FUNCTIONALITY, OR USEFULNESS FOR ANY COMMERCIAL OR 
        PRIVATE PURPOSE IS IMPLIED OR MADE.  THE AUTHOR HAS ENDEAVORED TO 
        MAKE THE PROGRAM WORK AND HAS TESTED IT TO THE BEST OF HIS 
        ABILITY.  WHETHER IT WILL WORK FOR THE USER OR MEET THE USER'S 
        NEEDS IS NOT WARRANTED IN ANY WAY.

             DISCLAIMER OF LIABILITY FOR USE:  YOU ASSUME RESPONSIBILITY 
        FOR THE SELECTION OF THIS PROGRAM TO ACHIEVE YOUR INTENDED 
        RESULTS.  IN NO EVENT WILL THE AUTHOR, KARL W. EHRLICH, BE LIABLE 
        TO YOU FOR ANY DAMAGES, INCLUDING BUT NOT LIMITED TO, LOST 
        PROFITS, SAVINGS, OR OTHER INCIDENTAL AND/OR CONSEQUENTIAL 
        DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THIS PROGRAM.

                         >>>>>>>>>> LICENSE <<<<<<<<<<

             THE SOFTWARE AND DOCUMENTATION ON THE ACCOMPANYING DISK 
        FILES ARE AND REMAIN  THE PROPERTY OF KARL W. EHRLICH, BOX 722, 
        DAHLGREN, VA, 22448.  YOU MAY COPY THIS DISK TO MAKE A MASTER 
        WORKING COPY AND ANY NUMBER OF ARCHIVAL COPIES AS YOU MAY NEED TO 
        PRESERVE YOUR SOFTWARE INVESTMENT.  YOU MAY ALSO COPY AND 
        DISTRIBUTE THE PROGRAM, SO LONG AS YOU ALSO COPY THE ASSOCIATED 
        DOCUMENTATION AND SAMPLE FILES.  THE COPYRIGHT ON THESE ITEMS ARE 
        RESERVED TO THE AUTHOR.  YOU MAY TRANSFER THIS COPY OF THE 
        SOFTWARE AND ITS DOCUMENTATION TO ANOTHER PERSON SO LONG AS THE 
        PERSON RECEIVING THIS SOFTWARE AGREES TO THE TERMS STATED HEREIN.

             YOU MAY, AT YOUR OWN RISK, MODIFY THE PASCAL SOURCE CODE IN 
        THIS PROGRAM AND MAKE USE OF THE CODE AND IDEAS CONTAINED 
        THEREIN.  IF YOU DO SO YOU MAY NOT DISTRIBUTE THE RESULTING 
        PRODUCT UNDER THE ORIGINAL NAME, AND MUST CITE THIS PROGRAM BY 
        REFERENCE IN THE DOCUMENTATION OF THE RESULTING PROGRAM.
             
        GREETINGS!

             ALL THE LEGAL STUFF ABOVE IS TO ENSURE THAT I DON'T GET SUED 
        FOR GIVING IT AWAY.  IT STILL APPLIES.  

             THIS IS MY FIRST PROGRAM PRODUCED FOR THE PUBLIC USE.  IT 
        CAME ABOUT AS AN OUTGROWTH OF LEARNING TO USE TURBO PASCAL.  
        OBVIOUSLY THE PROJECT TOOK ON A LIFE OF ITS OWN AND A USEFULL, I 


                                        1











        HOPE, PRODUCT RESULTED.  IT REPRESENTS ABOUT 100 HOURS OF WORK 
        AND NEARLY 2000 LINES OF STRUCTURED SOURCE.  I HOPE THAT YOU ENJOY 
        IT.  I PLAN TO WRITE OTHER PROGRAMS IN THE FUTURE.  IF YOU ENJOY 
        THIS PROGRAM OR FIND IT USEFULL AND WOULD LIKE TO ENCOURAGE 
        FURTHER WORKS I WOULD APPRECIATE A DONATION OF MONEY ($5.00 WOULD 
        BE NICE, $10.00 WOULD BE WONDERFUL) ALONG WITH ANY CONSTRUCTIVE 
        COMMENTS OR SUGGESTIONS CONCERNING THE PROGRAM.  A COMBINED 
        CONTRIBUTION / SOFTWARE TROUBLE AND COMMENT FORM IS AT THE BACK 
        OF THIS FILE.



        WHAT YOU HAVE:

             ON THIS DISK YOU WILL FIND 5 FILES ASSOCIATED WITH THIS 
        PROGRAM.  THESE FILES ARE:

                  LOTTERY.DOC 
                  LOTTERY.COM
                  LOTTERY.PAS
                  DATA1.LFD
                  DATA2.LFD

             YOU ARE CURRENTLY READING THE LOTTERY.DOC FILE.

             LOTTERY.COM IS THE ACTUAL PROGRAM FILE, LOTTERY.PAS IS THE 
        TURBO PASCAL SOURCE CODE FOR THE PROGRAM, AND DATA1.LFD & 
        DATA2.LFD ARE DATA FILES WHICH I WILL EXPLAIN LATER.  

        WHAT THE PROGRAM DOES:

             THIS PROGRAM ALLOWS THE USER TO KEEP TRACK OF PICK 6/40 
        LOTTERY TICKETS (SUCH AS THOSE SOLD IN THE MARYLAND LOTTERY) THAT 
        HE (OR SHE) MAY HAVE PURCHASED, STORE SETS OF THESE TICKETS TO 
        DISK, RETRIEVE THESE SETS AND ENTER THE WINNING LOTTERY NUMBERS, 
        AND RAPIDLY DETERMINE IF THERE ARE ANY WINNERS IN THE SET.  IT 
        ALSO ALLOWS THE USER TO RUN SIMULATIONS OF 200 TICKETS DRAWN 
        AGAINST A RANDOM WINNER TO EXPERIENCE THE ODDS OF WINNING.  IT IS 
        DESIGNED FOR ENTERTAINMENT USE ONLY AND ALL OTHER USES ARE 
        STRICTLY AT THE USER'S RISK.  

             THE PROGRAM IS RELATIVELY SIMPLE AND MENU DRIVEN.  IT ALLOWS 
        THE USER TO GENERATE ANY NUMBER OF RANDOM SELECTIONS, UP TO 200, 
        WHICH CAN THEN BE BET WHERE IT IS LEGAL TO DO SO.


        WHAT THE PROGRAM DOES >>>>NOT<<<< DO:

             THIS PROGRAM DOES NOT IMPROVE YOUR ODDS OF WINNING AT ANY 
        LOTTERY OR GAMBLING VENTURE.  FURTHER THE AUTHOR TAKES THIS 
        OPPORTUNITY TO FIRMLY STATE THAT IT IS NOT INTENDED TO IMPROVE 
        YOUR CHANCES OF WINNING, OR FOR THAT MATTER INCREASE YOUR CHANCES 


                                        2











        OF LOSING, AT ANY GAME OF CHANCE, SKILL, SKULLDUGGERY, DECEIT, OR 
        GOVERNMENT SPONSORSHIP (SUCH AS A STATE LOTTERY).  IF YOU 
        OBTAINED THE PROGRAM FOR THIS PURPOSE, GIVE UP THE IDEA NOW.  
        THIS PROGRAM WAS WRITTEN FOR TO BE USED FUN.


        SYSTEM REQUIREMENTS:

             TO RUN THIS PROGRAM YOU NEED:

        1.   IBM PC* OR IBM XT*
        2.   COLOR GRAPHICS BOARD AND COLOR MONITOR
        3.   PC DOS 2.0 OR LATER
        4.   IBM PERSONAL COMPUTER PRINTER OR GRAPHICS PRINTER OR MOST 
             OTHER PRINTERS WITH CONTINUOUS FORM PAPER.  PRINTER MUST BE
             CONFIGURED AS LPT1: OR PRN: **

        *    IBM IS INTERNATIONAL BUSINESS MACHINES
        **   PROGRAM CAN BE RUN WITHOUT A PRINTER

             THIS PROGRAM SHOULD WORK WITH THE VARIOUS IBM PC CLONES THAT 
        ARE 100% COMPATIBLE INCLUDING COLOR GRAPHICS.  IT SHOULD ALSO 
        WORK WITH MS-DOS 2.0 OR GREATER.  BUT, THESE CONFIGURATIONS HAVE 
        NOT BEEN TESTED.

             THIS PROGRAM IS PROVIDED IN COMPILED FORM, AND WAS WRITTEN 
        IN BORLAND INTERNATIONAL'S TURBO PASCAL 2.0.  I HIGHLY RECOMMEND 
        THIS PASCAL TO ANY WHO WANT TO TRY THE LANGUAGE.

        GETTING STARTED:

             THE FIRST THING YOU SHOULD DO IS MAKE A BOOTABLE COPY OF 
        THIS PROGRAM.  TO DO THIS START WITH A NEW DISK AND FORMAT IT WITH 
        YOUR SYSTEM DOS ON THE DISK.  INCLUDE YOUR COMMAND.COM AND ANY 
        USUAL BOOT FILES THAT YOU MAY NORMALLY USE.  FOR INSTRUCTIONS ON 
        HOW TO DO THIS CONSULT YOUR USER'S MANUAL OR YOUR FRIENDLY 
        NEIGHBORHOOD COMPUTER GURU, WHICHEVER IS EASIER.  NEXT COPY THE 
        FILES ON THIS DISK TO THE BOOTABLE DISK.

             AFTER MAKING THE BOOTABLE COPY OF THE PROGRAM FROM THIS DISK 
        PUT A WRITE PROTECT TAB ON IT IF ONE IS NOT ALREADY THERE, AND 
        STORE IT AWAY IN A SAFE PLACE AGAINST FUTURE NEED.

             MAKE ANOTHER COPY OF YOUR BOOTABLE DISK.  KEEP ONE AS THE 
        BACKUP AND THE OTHER AS A MASTER.


        TO START THE PROGRAM:

             IF YOUR COMPUTER IS ALREADY BOOTED AND RUNNING WITH THE DOS 
        PROMPT SHOWING IN THE MONITOR:




                                        3











        1.   SELECT DRIVE A OR B (YOUR CHOICE) AS THE ACTIVE DRIVE.

        2.   INSERT THE DISK IN THE ACTIVE DRIVE (A OR B).

        3.   TYPE "LOTTERY" AND PRESS RETURN.

        4.   THE PROGRAM WILL LOAD AND RUN.

             IF YOUR COMPUTER IS SHUT OFF:

        1.   INSERT THE PROGRAM DISK INTO DRIVE A.

        2.   POWER UP THE SYSTEM.

        3.   WHEN THE DOS PROMPT APPEARS TYPE "LOTTERY" AND PRESS RETURN.

        4.   THE PROGRAM WILL LOAD AND RUN.


        OPERATING THE PROGRAM:

             WHEN YOU START THE PROGRAM AN INITIAL SCREEN WILL APPEAR 
        SHOWING THE NAME OF THE PROGRAM, ITS VERSION NUMBER, AND A 
        COPYRIGHT NOTICE.  YOU WILL ALSO HEAR A SHORT ALTERNATING TWO 
        NOTE SIGNAL.  DO NOT BE ALARMED, THIS PROGRAM HAS A FEW 
        INTERESTING BELLS AND WHISTLES IN VARIOUS PARTS OF ITS OPERATION.

             THE INITIAL SCREEN IS FOLLOWED BY THE MAIN MENU WHICH GIVES 
        THE CHOICES AVAILABLE TO THE USER.  ONLY THOSE CHOICES WHICH ARE 
        VALID WILL APPEAR.  THE TOTAL LIST OF CHOICES INCLUDES:

        0.        EXIT THE PROGRAM.

        1.        READ A TICKET SET FROM DISK
        2.        START NEW TICKET SET
        3.        ENTER MORE TICKETS INTO SET (FROM KEYBOARD)
        4.        ADD RANDOM PICKS (TICKETS) TO THE SET
        5.        EDIT TICKETS IN THE SET

        6.        STORE TICKET SET TO DISK
        7.        ENTER (OR ERASE) WINNING TICKET DRAW
        8.        SCAN TICKET SET FOR WINNERS
        9.        PRINT TICKET SET
        10.       DISPLAY TICKET SET

        11.       RUN SIMULATION OF (200 TRIALS) LOTTO
        12.       OPTIONS MENU (CHANGE PRINT AND DISPLAY OPTIONS)
        13.       DATA FILE DIRECTORY
        14.       ERASE DATA FILE
        15.       RENAME DATA FILE





                                        4











             OPERATING THE PROGRAM REQUIRES ONLY THAT THE USER ENTER THE 
        CHOICE DESIRED AND PRESS THE RETURN KEY.  IF AN ILLEGAL OR 
        NONSENSE ANSWER IS ENTERED AN ERROR MESSAGE MAY BE GENERATED 
        FOLLOWED BY A RETURN TO THE MOST RECENT PROMPT.

             IN SOME CASES THE PROGRAM WILL GIVE AN ERROR MESSAGE AT THE 
        BOTTOM OF THE SCREEN AND PAUSE.  SIMPLY PRESS ANY KEY AND THE 
        PROGRAM SHOULD RESUME.

             SINCE IT IS RARE (IF EVER) THAT A PERSON ACTUALLY HITS A BIG 
        WINNER IN A LOTTERY, I HAVE INCLUDED TWO DATA FILES THAT PROVIDE 
        YOU WITH SOME OF THE TYPICAL PROGRAM OUTPUT.  DATA1 HAS A 4 
        NUMBER MATCH, A 5 NUMBER MATCH, AND A 6 NUMBER MATCH TO 
        ILLUSTRATE THE OUTPUTS AVAILABLE TO THE USER.  DATA2 HAS A 
        SIMULATION RUN USING THE PROGRAM IN WHICH THREE WINNERS WERE 
        ENCOUNTERED IN A 200 TICKET SET.  TRY THEM FOR EXPERIENCE.

             EACH OF THE AVAILABLE CHOICES WILL BE DESCRIBED BELOW:

        ----------

        CHOICE 0,      EXIT PROGRAM.

             THIS CHOICE WILL CAUSE A NORMAL EXIT FROM THE PROGRAM AND 
        RETURN YOU TO DOS.

        ----------

        CHOICE 1,      READ TICKET SET FROM DISK.

             THIS CHOICE ALLOWS THE USER TO READ IN A DATA FILE OF 
        TICKETS FROM THE DISK.  DATA FILES ARE NAMED WITH AN UP TO 8 
        CHARACTER NAME OR A DRIVE PREFIX AND AN UP TO 8 CHARACTER NAME.  
        EXAMPLES OF VALID NAMES ARE:

             DATA      A:DATA    HERO1     B:HERO2   C:ZAPP

             FILES ARE STORED ON DISK WITH A .LFD SUFFIX.  DO NOT INCLUDE 
        THE SUFFIX IN YOUR FILE NAME ENTRY OR IT WILL BE REJECTED.  THE 
        PROGRAM TAKES CARE OF THE SUFFIX.

                                  *** NOTE *** 

             THIS CHOICE WILL WIPE OUT ANY TICKET SET CURRENTLY STORED IN 
        MEMORY.

        ----------

        CHOICE 2,      START NEW TICKET SET.

             THIS CHOICE WILL WIPE OUT ANY TICKET SET IN MEMORY AND ALLOW 
        THE USER TO GENERATE A TICKET SET IN ANY WAY DESIRED.



                                        5












        ----------

        CHOICE 3,      ENTER MORE TICKETS INTO SET.

             THIS CHOICE ALLOWS THE USER TO INPUT SELECTIONS FOR A 
        LOTTERY TICKET IN ANY ORDER.  THE SCREEN CLEARS AND THE USER IS 
        INFORMED OF HOW MANY MORE TICKETS MAY BE ENTERED.  TO ABORT 
        TICKET ENTRY, OR TO END THE ENTRY OF TICKETS YOU MAY ENTER A 
        SELECTION OF 0 AT ANY TIME.  THE SYSTEM WILL PROMPT YOU FOR 6 
        NUMBERS BETWEEN 1 AND 40 WHICH MAY BE ENTERED IN ANY ORDER.  
        AFTER THE SIXTH ENTRY YOUR SELECTED NUMBERS WILL BE SORTED AND 
        THE SELECTION VALIDATED.  IF YOU PICKED A SELECTION WHICH IS 
        INVALID A MESSAGE WILL BE DISPLAYED FOLLOWED BY A RETURN TO THE 
        SELECTION PORTION OF THE ROUTINE.  IF YOU PICKED A VALID 
        SELECTION FOR A TICKET YOU WILL BE ASKED TO CONFIRM OR REJECT THE 
        ENTRY.  THE ROUTINE WILL THEN LOOP BACK TO THE START.  TO RETURN 
        TO THE MAIN MENU SIMPLY ENTER A SELECTION OF 0.

        ----------

        CHOICE 4,      ADD RANDOM PICKS TO SET.

             THIS CHOICE ALLOWS YOU TO REQUEST THE COMPUTER TO GENERATE 
        ANY NUMBER OF RANDOM TICKETS UP TO THE MAXIMUM REMAINING SPACE IN 
        THE 200 TICKET SET.  THUS, IF THE SET ALREADY CONTAINS 103 
        TICKETS YOU WOULD BE TOLD THAT YOU CAN ONLY REQUEST 97.  YOU MAY 
        EXIT THIS ROUTINE BY TYPING IN AN ENTRY OF 0 CAUSING NO TICKETS 
        TO BE GENERATED.

        ----------

        CHOICE 5,      EDIT TICKETS IN THE SET.

             THIS CHOICE ALLOWS YOU TO EDIT TICKETS IN THE TICKET SET TO 
        CORRECT ERRORS.  WHEN YOU SELECT EDIT A MENU WILL APPEAR GIVING 
        YOU 4 OPTIONS:

        OPTION  0.     EXIT THE EDIT FUNCTION.

        OPTION  1.     INSERT A TICKET INTO THE SET.

                       THIS IS THE EQUIVALENT OF THE ENTER TICKETS 
                  FUNCTION (CHOICE 3) BUT ALLOWS THE USER TO SPECIFY 
                  WHERE IN THE SET THAT THE TICKET IS TO GO.  THE TICKET 
                  AT THAT POSITION AND ALL OTHERS AT HIGHER NUMBERED 
                  POSITIONS ARE MOVED UP ONE POSITION IN THE SET AND THE 
                  SET GROWS BY ONE TICKET.






                                        6











        OPTION  2.     DELETE A TICKET FROM THE SET.

                                 THIS OPTION IS USED TO REMOVE A TICKET 
                  FROM THE SET.  YOU ARE ASKED TO CONFIRM YOUR DESIRE TO 
                  DO SO AND ARE WARNED THAT THE TICKET NUMBERS (TICKET NO 
                  1, TICKET NO 2 ETC.) ASSOCIATED WITH EACH REMAINING 
                  TICKET MAY BE CHANGED AS A RESULT.  IF YOU CONFIRM YOUR 
                  DESIRE TO DELETE A TICKET YOU WILL BE ASKED FOR THE 
                  NUMBER OF THE TICKET TO BE DELETED.  THE SELECTED 
                  TICKET IS DELETED, ALL TICKETS ABOVE THE SELECTED 
                  TICKET ARE DROPED ONE POSITION IN THE LIST AND THE SIZE 
                  OF THE TICKET SET IS REDUCED BY ONE.  THE ROUTINE THEN 
                  RETURNS YOU TO THE MAIN MENU.  (SEE PRINT TICKETS AND 
                  DISPLAY TICKETS)

        OPTION  3.     REPLACE A TICKET IN THE SET.

                       THIS OPTION ALLOWS THE USER TO REPLACE AN 
                  INCORRECT TICKET IN THE SET WITH A CORRECT ENTRY.  IT 
                  IS FUNCTIONALLY EQUIVALENT TO USING OPTIONS 1 & 2 
                  SEQUENTIALLY FOR THE SAME SET POSITION.

        ----------

        CHOICE 6.      STORE TICKET SET TO DISK.

             THIS CHOICE ALLOWS YOU TO STORE THE CURRENT TICKET SET TO 
        DISK.  YOU WILL BE PROMPTED FOR A FILE NAME AS USED IN CHOICE 1.  
        WARNINGS ARE ISSUED PRIOR TO OVERWRITING AN EXISTING FILE.

        ----------

        CHOICE 7.      ENTER WINNING TICKET DRAWN.

             THIS CHOICE ALLOWS YOU TO ENTER A WINNING NUMBER FOR TICKETS 
        IN THE SET TO BE COMPARED AGAINST.  IT MAY EITHER BE ENTERED BY 
        THE KEYBOARD, OR A RANDOM DRAW CAN BE REQUESTED.  THIS CHOICE 
        ALSO PROVIDES A WAY TO WIPE (ERASE) THE CURRENT WINNING TICKET 
        DRAW.

        ----------

        CHOICE 8.      SCAN TICKET SET FOR WINNERS.

             THIS CHOICE CAUSES THE PROGRAM TO COMPARE THE WINNING TICKET 
        (CHOICE 7) WITH THE TICKETS IN THE SET (CHOICE 3,4,5) AND FIND 
        ANY WINNERS WITH 4, 5, OR 6 NUMBERS MATCHING.  DEPENDING ON THE 
        OPTIONS IN FORCE THE WINNING COMBINATIONS WILL BE DISPLAYED AND 
        OR PRINTED.  A SUMMARY OF THE NUMBER OF TICKETS SCANNED AND 
        NUMBER OF WINNERS FOUND IS GIVEN ON THE SCREEN.  SOUND EFFECTS 
        ARE INCLUDED.




                                        7











        ----------

        CHOICE 9.      PRINT TICKET SET.

             THIS CHOICE CAUSES THE TICKET SET TO BE PRINTED ON YOUR 
        PRINTER.

        ****** WARNING DO NOT USE THIS UNLESS YOU HAVE A PRINTER ******
        ----------

        CHOICE 10.     DISPLAY TICKET SET.

             THIS CHOICE CAUSES THE TICKET SET AND WINNING TICKET DRAWN 
        TO BE DISPLAYED ON THE MONITOR 20 TICKETS AT A TIME.

        ----------

        CHOICE 11.     RUN SIMULATION.

             THIS CHOICE CAUSES A 200 RANDOM TICKET SET TO BE GENERATED 
        ALONG WITH A RANDOM DRAW.  THE SET IS THEN CHECKED FOR WINNERS.  
        IT IS THE EQUIVALENT OF THE FOLLOWING.

        A.   CHOICE 2, START NEW TICKET SET
        B.   CHOICE 4, ENTER 200 RANDOM TICKETS
        C.   CHOICE 7, PICK A RANDOM WINNER
        D.   CHOICE 8, CHECK FOR WINNING TICKETS

        ----------

        CHOICE 12.     OPTIONS MENU.

             THIS CHOICE ALLOWS THE USER TO CHANGE THE AUTOMATIC OPTIONS 
        IN THE PROGRAM.  AN OPTIONS MENU WILL BE DISPLAYED.  ENTERING THE 
        NUMBER OF AN OPTION WILL TOGGLE IT BETWEEN YES AND NO.  ENTERING 
        A 0 WILL EXIT THE OPTIONS MENU.

             THE EFFECTS OF THE OPTIONS ARE:

        1.   PRINT WINNERS WHEN FOUND;     WILL CAUSE ANY WINNING TICKETS 
             TO BE PRINTED WHEN USING CHOICES 8 OR 11.

        2.   DISPLAY WINNERS WHEN FOUND;     WILL CAUSE ANY WINNING 
             TICKETS TO BE DISPLAYED WHEN USING CHOICES 8 OR 11.

        3.   AUTOPRINT TICKETS;     WILL CAUSE TICKET SETS GENERATED 
             USING CHOICE 11 OR READ IN USING CHOICE 1 TO BE PRINTED.

        4.   AUTODISPLAY TICKETS;     WILL CAUSE TICKET SETS RESULTING 
             FROM CHOICES 1, 4, 5, & 11 TO BE DISPLAYED.

             DEFAULT SETUP IS OPTION 2 YES, ALL OTHERS NO.  I RECOMMEND 


                                        8











        IT UNLESS YOU LIKE A LOT OF DISPLAY OR PRINTOUT.  CHOOSE FOR 
        YOURSELF.

                                 *** WARNING ***
            DO NOT TURN PRINTER OPTIONS ON UNLESS YOU HAVE A PRINTER

        ----------

        CHOICES 13,14,15.

             THESE CHOICES LET YOU GET A LIST OF DATA FILES, DELETE DATA 
        FILES, AND RENAME DATA FILES.  THEY ARE REASONABLY SELF DIRECTED.  
        TRY THEM WHEN NEEDED.  REMEMBER DO NOT USE THE .LFD SUFFIX (OR 
        ANY OTHER SUFFIX) WHEN GIVING THE PROGRAM A FILE NAME.




          ** SOME COMMENTS ON ODDS OF WINNING IN A PICK 6/40 LOTTERY **

             THE ODDS OF WINNING IN A PICK 6 OUT OF 40 NUMBERS TYPE 
        LOTTERY ARE ABOUT 1 IN 3.8 MILLION AGAINST YOU.  THE ODDS OF 
        MATCHING 5 OF THE 6 NUMBERS ARE ABOUT 1 IN 18,820.  EVEN THE ODDS 
        OF MATCHING 4 OF THE 6 NUMBERS ARE ABOUT 1 IN 456 AGAINST YOU.  

             MOST LOTTERIES USUALLY HAVE PAYOFFS THAT ARE MUCH LESS THAN 
        THE ODDS WOULD ALLOW. TYPICALLY 50% OR LESS.  IF YOU BET ON THEM 
        REMEMBER THAT FACT.  HOWEVER, LOTTERIES ARE FUN IF BET ON IN 
        MODERATION, AND MOST PEOPLE WOULDN'T BUY THIS PROGRAM IF IT 
        WEREN'T TRUE.





                    *** ABOUT THE RANDOM NUMBER GENERATOR ***


             THE RANDOM NUMBER GENERATOR IN THIS PROGRAM HAS BEEN TESTED 
        BY SELECTING SETS OF 32000 TICKETS AND RUNNING A FREQUENCY 
        DISTRIBUTION CHECK.  THE DISTRIBUTION HAS PROVEN FLAT WITH A 
        STANDARD DEVIATION OF 1.5 PERCENT OR LESS AFTER 100 TRIALS.  THIS 
        IS GOOD ENOUGH FOR JUST ABOUT ANY PURPOSE.











                                        9











                             CONTRIBUTION & STR FORM

        SEND TO:  KARL W. EHRLICH
                  P. O. BOX 722
                  DAHLGREN, VIRGINIA 22448

        CONTRIBUTION ENCLOSED?__________ $__________.

        SOFTWARE PROBLEM? _______________,  COMMENTS? ______________.

        IF YOU HAVE A PROBLEM OR COMMENT ON THE OPERABILITY OF THE 
        PROGRAM PLEASE INCLUDE THE FOLLOWING.

        1.   DESCRIPTION OF THE COMPUTER BEING USED, TYPE, GRAPHICS CARD, 
             PRINTER, MONITOR ETC.  INCLUDE MANUFACTURER AND MODEL 
             NUMBERS IF KNOWN.

        2.   NAME OF DOS (EG. MS-DOS 2.0, PC-DOS 3.11, ETC.).

        3.   A LISTING AND EXPLANATION OF YOUR COMMAND.SYS AND 
             AUTOEXEC.BAT FILES.

        4.   PRINTOUTS OF THE OFFENDING SCREEN, IF AVAILABLE.

        5.   A DETAILED DESCRIPTION OF WHAT WENT WRONG.  REMEMBER, I 
             WASN'T THERE WHEN IT HAPPENED TO YOU.

             I WILL ENDEAVOR TO READ ANY TROUBLE REPORTS AND COMMENTS I 
        RECEIVE, AND WILL ANSWER THEM ON A TIME AVAILABLE BASIS.  (I WORK 
        AT A REGULAR JOB AND DO THIS STUFF IN MY SPARE TIME).  I 
        THEREFORE CANNOT PROMISE A SWIFT OR SURE ANSWER.  PEOPLE WHO HAVE 
        MADE A CONTRIBUTION TO MY EFFORTS WILL OF COURSE GET TOP 
        PRIORITY.





















                                       10






```
{% endraw %}

## NOTES749.TXT

{% raw %}
```
Program name:  Quantoids of Nebulous IV
 
Author name:   Kludgeware
Address:       3145 Beary Blvd.
               Suite 610
               San Francisco, Ca., 94118
 
Telephone Number:  None given.
 
Suggested Donation:  $25, includes customized program version.
 
Program Description:
 
You are commander Kludge, on a spaceship in hot pursuit of the Quantoids.
The object of the game is to destroy enemy Quantoid ships before they
infect the universe with their unimaginative MBA quantitative methods.
Enemy Quantoid ships are filled with graduates of notorious business
schools, and you get points for destroying each ship. San Jose State is
worth 200 points while U.C. Berkeley is the highest, worth 50,000 points.
Each successive ship that is destroyed is worth more points. If you
disagree with the point system you can get a customized version of the
program by sending in the donation. The screen shows you looking out from
the cockpit of your spaceship, and you have various controls to maneuver,
change the ship's speed, and fire at enemy ships. There is an automatic
enemy detection mode which allows you to find enemy ships quickly and
attack them. When attacking enemy Quantoid ships, you must be careful for
they will approach your ship and return fire. You have a shield which can
take a certain amount of hits, after which one direct hit will destroy your
ship. This program requires a color graphics monitor, but it has been
tested on an EGA monitor and works just as well.
 
***************************************************************************
 
Program name:        Space Rescue (v1)
 
Author name:         Monte Giles
Address:             NW 440 Elk Ridge
                     Hamilton, MT 59840
Telephone Number:    (406) 363-1089
 
Suggested Donation:   $12
 
Program Description:
 
Space Rescue is a variation on the "Lunar Lander" theme. You must launch
from earth, maneuver your ship to dock with a space station, transfer the
space station crew, and return and make a safe landing on earth. When you
dock with the space station or return to earth you must approach at a
reasonable angle or you will crash (there are a number of different
messages for both failures and successes). Your score (if you survive)
depends on how well you conserve time and fuel.
 
It has very few commands to learn (Launch, Rotate, Fire engine, draw shape
of Orbit, and change parameter Display). This makes Space Rescue very easy
to learn, but not necessarily easy to master. You can not simply tell your
ship to "Go that way" and expect it to comply. You must alternate firing
your engines while facing both forward and backwards in order to
successfully dock with the space station or to land. The author provides a
few useful hints, but leaves a lot for the user to find out himself.
 
Space Rescue has both an easy and a hard level, but I couldn't tell the
difference between the two (I actually had more success with the "hard"
level).
 
Space Rescue is designed for use on an IBM PC or compatible operating at
4.77 MHz. The pace of the game will speed up if computers with faster
clocks are used, and it is suggested that such computers be run at 4.77 MHz
if this option is available. Space Rescue also requires an IBM Color
Graphics Adapter and a color or monochrome monitor (it will run with a
monochrome monitor, but much of the information on the game screen will be
difficult to interpret).
 
***************************************************************************
 
Program name:  LOTTERY FUN v1.003
 
Author name:  Karl W. Ehrlich
Address:      P.O. Box 722
              Dahlgren, VA  22448
Telephone:    none
 
Suggested donation: $5 - $10
 
Program description:
 
'Lottery Fun' is a program for maintaining a list (or multiple lists) of
'LOTTO 6/40' tickets. Tickets can be entered manually or the program will
generate them for you. You can run a simulation of 200 randomly drawn
tickets against a random 'Winning' ticket to get the idea of how the odds
work. The documentation contained on the disk gives some interesting odds
information about 'Lotto' type games.
 
Lottery Fun runs on any PC or compatible with a CGA (color graphics
adapter) card and one disk drive. The program was written in Turbo Pascal
and the source code is included for those who like to tinker.
```
{% endraw %}

{% comment %}samples_end{% endcomment %}

### Directory of PC-SIG Library Disk #0749

     Volume in drive A has no label
     Directory of A:\

    QUANTOID EXE     99546   3-31-87   6:35a
    ORDER    EXE     36682   3-31-87   6:32a
    -------  ---         4   4-04-87  11:50a
    LOTTERY  PAS     52099  11-08-86   5:02p
    LOTTERY  DOC     21675  11-08-86   7:26p
    LOTTERY  COM     30393  11-08-86   5:08p
    DATA1    LFD        36   8-17-86  12:16p
    DATA2    LFD      1206   8-28-86   8:16p
    ------   ---         4   4-04-87  11:53a
    RESCUE   COM     44596  10-31-86   7:50a
    README   RES       792  10-30-86  10:19p
    GO       BAT       424   4-04-87   1:48p
    NOTES749 TXT      4401   4-04-87  12:07p
    FILES749 TXT      2448   4-04-87   1:41p
           14 file(s)     294306 bytes
                           19456 bytes free
