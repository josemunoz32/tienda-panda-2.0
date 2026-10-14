const fs = require('fs');
const path = require('path');

const rawText = `JUEGOS DISPONIBLES								
5
Si tu juego no esta aquí mandanos un mensaje @raymangames.cl						
6
Steam	Electronic Arts	Ubisoft	
SE VENDEN APARTE
NO DISPONIBLES
7
3DMark	Battlefield 3™	Anno 1800	
Atomfall + DLC
EA SPORTS FC™ 24 | FC24
8
60 Seconds! Reatomized	Battlefield™ V	Assassin's Creed: Brotherhood	
Anno 117: Pax Romana
Battlefield VI
9
7 Days to Die	Burnout Paradise: The Ultimate Box	Assassin's Creed II	
Atomic Heart + DLC
Arc Raiders
10
911 Operator	Command & Conquer™ Remastered Collection	Assassin's Creed III	
Avatar: Frontiers Of Pandora + DLC | AFOP
HellDivers 2
11
Resident Evil Requiem	Dragon Age: Origins - Ultimate Edition	Assassin's Creed IV: Black Flag	
Assassin's Creed Shadows + DLC
EA Sports - FC25 | FC25
12
A Plague Tale: Innocence	Dragon Age™: Inquisition	Assassin's Creed Mirage | ACM	
Black Myth: Wukong
EA SPORTS FC™ 26
13
DOOM: The Dark Ages
14
A Plague Tale: Requiem	Dragon Age™: Inquisition	Assassin's Creed: Syndicate	
Demon Slayer -Kimetsu no Yaiba- The Hinokami Chronicles
RUST
15
Age of Empires: Definitive Edition	Mass Effect (2007)	Assassin's Creed: Unity	
Demon Slayer The Hinokami Chronicles 2 + DLC
DAYZ
16
Aka Manto	Mass Effect 2 (2010)	Far Cry	
Digimon Story Time Stranger + DLC
PHASMOPHOBIA
17
Alan Wake	Mirror's Edge	Far Cry 3	
Dragon's Dogma 2 | DD2
18
Alan Wake's American Nightmare	Mirror's Edge™ Catalyst	Far Cry 3 - Blood Dragon	
DRAGON QUEST I & II HD-2D Remake
19
Alien: Isolation	
Need for Speed™ Heat
$5.000	Far Cry 4	
FAR Changing Tides
GTA V
20
Aliens: Dark Descent	
Need for Speed™ Hot Pursuit Remastered
$5.000	Far Cry 6	
Final Fantasy XV + DLC | FFXV
DRAGON BALL FIGHTERTZ
21
Aliens vs. Predator	
Need for Speed™ Payback | NFSP
$5.000	Far Cry: New Dawn	
Football Manager 26
Borderlands 4 + DLC
22
Among the Sleep - Enhanced Edition	
STAR WARS Jedi: Fallen Order™
Ghost Recon: Wildlands	
Jurassic World Evolution 3 + DLC
Batman: Arkham Knight
23
Among Us	
Forza horizon 5
$6.000	Prince of Persia: The Sands of Time	
Like A Dragon: Infinite Wealth + DLC
Call of Duty 4: Modern Warfare
24
Animal Shelter				Prince of Persia: The Forgotten Sands	
Like A Dragon Gaiden: The Man Who Erased His Name
Call of Duty: Advanced Warfare - Gold Edition
25
Aragami 2				Prince of Persia: Warrior Within	
Like A Dragon: Ishin! + DLC
Call of Duty: Modern Warfare Remastered
26
ARK: Survival Evolved				The Division	
Like a Dragon: Pirate Yakuza in Hawaii Deluxe Edition
NARUTO TO BORUTO: SHINOBI STRIKER
27
ARSLAN: THE WARRIORS OF LEGEND				Tom Clancy's Splinter Cell: Conviction	
Lost Judgement + DLC
No Man's Sky
28
ASTRONEER				Splinter Cell: Blacklist	
Lost in Random
Outlast trials
29
Atomic Heart				Watch Dogs	
Marvel's Midnight Suns
Elden Ring Nightreign
30
Attack on Titan: A.O.T. Wings of Freedom				Watch Dogs 2	
Metaphor: ReFantazio + DLC
Middle-earth: Shadow of War
31
Avion Venge							
Mortal Kombat 1 + DLC
Resident evil 5
32
Bakery Simulator							
Need for Speed™ Payback
A Way Out
33
Baldur's Gate 3							
Need for Speed™ Hot Pursuit Remastered
Battlefield 1
34
Baldur's Gate II: Enhanced Edition							
Need For Speed Unbound
Unravel Two
35
Barony							
STAR WARS™: Squadrons
Assassin's Creed Valhalla
36
Barotrauma							
Octopath Traveler 0 + DLC
Far Cry: New Dawn
37
Batman: Arkham Asylum GOTY Edition							
Onimusha 2: Samurai's Destiny
38
Batman: Arkham City GOTY							
Persona 3 Portable
39
Persona 3 Reload + Aigis DLC
40
Batman: Arkham Origins							
Persona 4 Arena Ultimax
41
Beamng Drive							
Persona 4 Golden
42
Bendy and the Dark Revival							
Persona 4 Golden
43
Bendy and the Ink Machine							
Persona 5 Royal
44
Beyond: Two Souls							
Persona 5 Strikers
45
BioShock Infinite							
Persona 5 Tactica + DLC
46
Black Mesa							Planet Zoo							
47
Resident Evil Requiem					
48
Black Myth: Wukong							Redfall							
49
Blade & Sorcery							
RAIDOU Remastered: TMSA
50
Blasphemous							
Shin Megami Tensei III: Nocturne HD Remaster
51
Blasphemous 2							
Crimson Desert
52
Borderlands 2							
SHINOBI: Art of Vengeance DELUXE
53
Borderlands 3							
Sniper Elite 5
54
Sniper Elite: Resistance
55
Borderlands: The Pre-Sequel							
Sonic Colors Ultimate
56
Bright Memory							
Sonic Frontiers + DLC
57
Bright Memory: Infinite							
Sonic Superstars + DLC
58
Broforce							
Sonic X Shadow Generations + DLC
59
Brothers: A Tale of Two Sons							
Soul Hackers 2 + DLC
60
Bus Simulator 18							
Stranded Alien Dawn
61
Clair Obscur: Expedition 33							
Stellar Blade Complete Edition
62
Call of Duty (2003)							
Star Wars Outlaws + DLC | SWO
63
Call of Duty 2							
SUPER ROBOT WARS Y
64
Call of Duty: Black Ops							The Bus							
65
Call of Duty: Black Ops II							
The First Berserker: Khazan + DLC
66
Call of Duty: Black Ops III							
Two Point Campus
67
Call of Duty: United Offensive							
Two Point Museum
68
Call of Duty: Modern Warfare 2							Pragmata							
69
Call of Duty: Ghost							Forza Horizon 6					
70
Call of Duty: World at War							
SOLO LEVELING ARISE
71
Call of Juarez							
Warhammer Age of Sigmar: Realms of Ruin
72
Call to Arms - Gates of Hell: Ostfront							
Warhammer Chaos Gate - Daemonhunters
73
Car Mechanic Simulator 2015							Wild Hearts							
74
Car Mechanic Simulator 2021							
Forza Horizon 5 (CON ONLINE)
75
Castlevania: Lords of Shadow - Ultimate Edition							
Total warhamer 3 +dlc
76
Cat Quest							
Yakuza Kiwami 3
77
Celeste							F1 23							
78
Cities in Motion 2							F1 24							
79
Cities: Skylines							
Construction simulator
80
Cloudpunk							Dirt 5							
81
Company of Heroes 2							
Mafia The Old Country
82
Contraband Police							
Street Fighter 6
83
Control Ultimate Edition							Undisputed							
84
Counter-Strike: Condition Zero Deleted Scenes							Life is Strange: Reunion					
85
Counter-Strike: Source							Mega Man Star Force Legacy Collection					
86
Crash Bandicoot™ N. Sane Trilogy							
LEGO® Batman™: El Legado del Caballero Oscuro
87
Crashlands							
007 First Light
88
Crime Scene Cleaner							
Halo Campaign evolved
89
Cairn							
007 First Light
90
Crimson Desert														
91
Crusader Kings III														
92
Clover Pit														
93
Cuphead														
94
Death Stranding														
95
Death Stranding 2														
96
Crysis Remastered														
97
Crysis 2 Remastered														
98
Crysis 3 Remastered														
99
Cyberpunk 2077														
100
Deltarune														
101
Danganronpa 2: Goodbye Despair														
102
Danganronpa Another Episode: Ultra Despair Girls														
103
Danganronpa V3: Killing Harmony														
104
Danganronpa: Trigger Happy Havoc														
105
DARK SOULS II: Scholar of the First Sin														
106
DARK SOULS III														
107
DARK SOULS: REMASTERED														
108
Dark Souls II														
109
Darkest Dungeon														
110
Darkest Dungeon II
111
Darksiders II: Deathinitive Edition														
112
Darksiders III														
113
Darksiders: Warmastered Edition														
114
Dawn of Man														
115
Day of Defeat														
116
Day of Defeat: Source												
117
Days Gone														
118
Dispatch														
119
Dave the diver														
120
Dead Cells														
121
Dead Island 2															
122
Dead Island: Definitive Edition														
123
Dead Island: Riptide Definitive Edition														
124
DEAD OR ALIVE 6														
125
DEAD OR ALIVE Xtreme Venus Vacation														
126
DEAD RISING														
127
Dead Rising 2														
128
Dead Rising 2: Off the Record														
129
Dead Rising 3: Apocalypse Edition														
130
Dead Rising 4														
131
Dead Space (2008)														
132
Dead Space Remake														
133
Dead Space 3														
134
Demon Slayer Sweep the Board! | DSSB														
135
Demon Slayer The Hinokami Chronicles
136
Demon Slayer The Hinokami Chronicles II														
137
DESOLATE														
138
Desperados 2														
139
Desperados III														
140
Desperados: Wanted Dead or Alive														
141
Destroy All Humans!														
142
Detroit: Become Human														
143
Deus Ex: Mankind Divided														
144
Devil May Cry 3: Special Edition														
145
Devil May Cry 4: Special Edition														
146
Devil May Cry 5														
147
Devil May Cry HD Collection														
148
DIRT 2														
149
DIRT 4														
150
DIRT Rally 2.0														
151
Dishonored														
152
Dishonored 2														
153
Dishonored: Death of the Outsider														
154
Disneyland Adventures														
155
DmC: Devil May Cry														
156
Don't Starve Together														
157
DOOM (2016)														
158
DOOM Eternal														
159
DOOM: The Dark Ages														
160
DOOM I & II														
161
Door Kickers 2														
162
DRAGON BALL XENOVERSE														
163
DRAGON BALL XENOVERSE 2														
164
Dragon Ball Sparking Zero														
165
DRAGON BALL Z: KAKAROT														
166
DRAGON QUEST BUILDERS™ 2														
167
DRAGON QUEST HEROES II														
168
Dragon's Dogma: Dark Arisen														
169
DreadOut														
170
DreadOut 2														
171
Drug Dealer Simulator														
172
Dying Light														
173
Dying Light: The Beast														
174
DYSMANTLE														
175
Elden Ring + DLC														
176
Enshrouded														
177
Escape Simulator														
178
Escape the backrooms														
179
Euro Truck Simulator 2														
180
Europa Universalis IV														
181
EVERSPACE														
182
EVERSPACE™ 2														
183
Evil West														
184
Exit the Gungeon														
185
Forza Horizon 4
186
Forza Horizon 5														
187
Forza Horizon 6														
188
F.E.A.R. 3														
189
Factorio														
190
FAIRY TAIL														
191
Fallout														
192
Fallout 2														
193
Fallout 3 (REQUIERE FIX)														
194
Fallout 3 - Game of the Year Edition														
195
Fallout Tactics														
196
Fallout: New Vegas														
197
FAR Changing Tides														
198
FAR: Lone Sails														
199
Farming Simulator 17														
200
Farming Simulator 19														
201
Farming Simulator 25														
202
FINAL FANTASY I														
203
FINAL FANTASY II														
204
FINAL FANTASY III														
205
FINAL FANTASY IV														
206
FINAL FANTASY V														
207
FINAL FANTASY VI														
208
FINAL FANTASY VII REBIRTH														
209
FINAL FANTASY VII REMAKE INTERGRADE														
210
FINAL FANTASY VIII														
211
FINAL FANTASY IX														
212
FINAL FANTASY X														
213
FINAL FANTASY TYPE-0 HD														
214
FINAL FANTASY X/X-2 HD Remaster														
215
FINAL FANTASY XI														
216
FINAL FANTASY XII														
217
FINAL FANTASY XIII														
218
FINAL FANTASY XII THE ZODIAC AGE														
219
FINAL FANTASY XIII-2														
220
FINAL FANTASY XIV Online														
221
FINAL FANTASY XV WINDOWS EDITION														
222
Firefight														
223
Firewatch														
224
Fireworks Mania														
225
Five Nights at Freddy's														
226
Five Nights at Freddy's 2														
227
Five Nights at Freddy's 3														
228
Five Nights at Freddy's 4														
229
FIVE NIGHTS AT FREDDY'S: HELP WANTED														
230
Five Nights at Freddy's: Security Breach														
231
Five Nights at Freddy's: Sister Location														
232
Flashing Lights														
233
FlatOut 2														
234
FlatOut 4: Total Insanity														
235
Forager														
236
Frostpunk														
237
Game Dev Tycoon														
238
Gang Beasts														
239
Garfield Kart														
240
Garry's Mod														
241
Gears of War: Reloaded														
242
Gears 5														
243
Geometry Dash														
244
Getting Over It with Bennett Foddy														
245
Ghostrunner														
246
Goat Simulator														
247
Goat Simulator 3														
248
God of War														
249
God of War Ragnarok														
250
Golf It														
251
Gothic 1 Classic														
252
Gothic II: Gold Classic														
253
Grand Theft Auto III														
254
Grand Theft Auto IV: The Complete Edition														
255
Grand Theft Auto: San Andreas														
256
Grand Theft Auto: Vice City														
257
Grainy														
258
GreedFall														
259
Ghost of Tsushima														
260
Green Hell														
261
GRID 2														
262
GRID Autosport														
263
GROUND BRANCH														
264
Grounded														
265
Gunsmith Simulator														
266
Guts and Glory														
267
Hades														
268
Hades II														
269
Half-Life 2														
270
Half-Life: Alyx														
271
Half-Life: Blue Shift														
272
Half-Life: Opposing Force														
273
Half-Life: Source														
274
Halo: Spartan Assault														
275
Hatsune Miku: Project DIVA + DLC
276
Hearts of Iron IV														
277
Heavy Rain														
278
Hello Neighbor														
279
Hello Neighbor: Hide and Seek														
280
Hidden Deep														
281
Hitman 2: Silent Assassin														
282
Hi-Fi Rush														
283
Hitman: Absolution														
284
Hitman: Blood Money														
285
Hitman: Codename 47														
286
Hitman: Contracts														
287
HITMAN World of Assassination														
288
HITMAN™ 2														
289
Hogwarts Legacy														
290
Hollow Knight														
291
Hollow knight: Silksong														
292
Home Sweet Home														
293
Home Sweet Home EP2														
294
Horizon Zero Dawn™ Complete Edition														
295
Horizon Forbidden West™ Complete Edition														
296
Hotline Miami														
297
Hotline Miami 2: Wrong Number														
298
House Flipper														
299
Human: Fall Flat														
300
HUMANKIND														
301
It Takes Two														
302
inzoi														
303
I Am Alive														
304
Injustice 2														
305
Injustice: Gods Among Us Ultimate Edition														
306
INSIDE														
307
Is this seat taken														
308
Jotun: Valhalla Edition														
309
Journey														
310
JDM: Japanese Drift Master														
311
JUMP FORCE														
312
Jurassic World Evolution														
313
Jurassic World Evolution 2 + DLC
314
Jurassic World Evolution 3 + DLC
315
Just Cause														
316
Just Cause 2														
317
Just Cause 3														
318
Just Cause 4: Reloaded														
319
Kane & Lynch 2: Dog Days														
320
Katana ZERO														
321
Kenshi														
322
Kerbal Space Program														
323
Kerbal Space Program 2														
324
Kerbal Space Program: Breaking Ground Expansion														
325
Killing Floor 2														
326
Kingdom Come: Deliverance														
327
Kingdom Come: Deliverance II														
328
Kingdom Rush - Tower Defense														
329
Kingdom: Two Crowns														
330
KINGDOM HEARTS -HD 1.5+2.5 ReMIX-														
331
KINGDOM HEARTS HD 2.8 Final Chapter Prologue														
332
KINGDOM HEARTS III + Re Mind (DLC)														
333
KovaaK's														
334
Left 4 Dead														
335
Left 4 Dead 2														
336
LEGO Batman 2: DC Super Heroes														
337
LEGO Batman 3: Beyond Gotham														
338
LEGO City Undercover														
339
LEGO Harry Potter: Years 5-7														
340
LEGO Jurassic World														
341
LEGO MARVEL's Avengers														
342
LEGO The Hobbit														
343
LEGO The Lord of the Rings														
344
LEGO Worlds														
345
LEGO® Batman™: The Videogame														
346
LEGO® DC Super-Villains														
347
LEGO® MARVEL Super Heroes														
348
LEGO® MARVEL Super Heroes 2														
349
LEGO® Star Wars™ III: The Clone Wars™														
350
LEGO® Star Wars™: The Complete Saga														
351
LEGO® Star Wars™: The Skywalker Saga														
352
LEGO® The Incredibles														
353
LEGO® Indiana Jones™: The Original Adventures														
354
Lethal Company														
355
Life is Strange: Before the Storm														
356
Life is Strange Reunion														
357
Lies of P + DLC														
358
Like A Dragon Gaiden: T.M.W.E.H.N														
359
Like A Dragon: Infinite Wealth + DLC
360
Like A Dragon: Ishin! + DLC
361
Like a Dragon: P.Y.I.H (Deluxe Edition)														
362
LIMBO														
363
Little Nightmares														
364
Little Nightmares II														
365
Lossless Scaling														
366
Lost Judgement + DLC
367
Lost Planet 2														
368
Mount & Blade II: Bannerlord														
369
Mad Max														
370
Mafia														
371
Mafia II (Classic)														
372
Mafia II: Definitive Edition														
373
Mafia III: Definitive Edition														
374
Mafia: Definitive Edition														
375
Maid of Sker														
376
Marvel's Guardians of the Galaxy														
377
Mafia: el viejo continente
378
Marvel's Midnight Suns														
379
Max Payne														
380
Max Payne 2														
381
Max Payne 3														
382
METAL GEAR RISING: REVENGEANCE														
383
METAL GEAR SOLID V: GROUND ZEROES														
384
METAL GEAR SOLID Δ: SNAKE EATER														
385
METAL GEAR SURVIVE														
386
Megabonk														
387
Mewgenics														
388
METAL SLUG														
389
Metaphor: ReFantazio + DLC
390
Metro 2033														
391
Metro 2033 Redux														
392
Metro: Exodus														
393
Middle-earth: Shadow of Mordor														
394
Middle-earth: Shadow of War														
395
Monster Hunter Wilds														
396
Monster Hunter: World														
397
Mortal Kombat 11														
398
Mortal Kombat X														
399
My Friend Pedro														
400
My Summer Car														
401
My Time at Portia														
402
NARUTO SHIPPUDEN: Ultimate Ninja STORM 2														
403
NARUTO SHIPPUDEN: Ultimate Ninja STORM 3 Full Burst														
404
NARUTO SHIPPUDEN: Ultimate Ninja STORM 4														
405
NARUTO SHIPPUDEN: Ultimate Ninja STORM Revolution														
406
NARUTO: Ultimate Ninja STORM														
407
408
409
Neon Abyss														
410
Ni no Kuni™ II: Revenant Kingdom														
411
NieR: Automata														
412
NieR Replicant														
413
Nioh: Complete Edition														
414
Nioh 2														
415
Nioh 3																
416
Nocturnals														
417
Notia														
418
UNCHARTED™: Colección Legado de los Ladrones														
419
ONE PIECE ODYSSEY														
420
ONE PIECE: World Seeker														
421
ONE PUNCH MAN: A HERO NOBODY KNOWS														
422
One Piece: Unlimited World Red - Deluxe Edition														
423
Onimusha 2: Samurai's Destiny														
424
Operator														
425
Ori and the Blind Forest														
426
Ori and the Blind Forest: Definitive Edition														
427
Ori and the Will of the Wisps														
428
Osteya														
429
Outcast - A New Beginning														
430
Outer Wilds														
431
Outlast														
432
Outlast 2														
433
Overcooked														
434
Overcooked! 2														
435
Overgrowth														
436
Oxygen Not Included														
437
Pragmata														
438
Pacify														
439
Papers, Please														
440
PAYDAY 2														
441
PC Building Simulator														
442
Peggle Deluxe														
443
Persona 3 Portable														
444
Persona 3 Reload + Aigis DLC
445
Persona 4 Arena Ultimax														
446
Persona 4 Golden														
447
Persona 5 Royal														
448
Persona 5 Strikers														
449
Persona 5 Tactica + DLC
450
Phasmophobia														
451
Phoenix Wright: Ace Attorney Trilogy														
452
Pikuniku														
453
Plague Inc: Evolved														
454
Planet Coaster 2														
455
Police Simulator: Patrol Officers														
456
Poly Bridge														
457
Poly Bridge 2														
458
Portal														
459
Portal 2														
460
Possessed														
461
POSTAL 4: No Regerts														
462
POSTAL Redux														
463
Postal 3														
464
Prey														
465
Prison Simulator														
466
Project Zomboid														
467
Psychonauts 2														
468
Quantum Break														
469
Radiation Island														
470
Raft														
471
RAIDOU Remastered: TMSA														
472
Rain World														
473
Rayman: Raving Rabbids														
474
Ready or Not														
475
Red Dead Redemption 1														
476
Red Dead Redemption 2														
477
Redfall														
478
Remember Me														
479
Ratchet & Clank: Una dimensión aparte														
480
Rimworld														
481
Returnal														
482
Resident Evil 0														
483
Resident Evil 2 Remake														
484
Resident Evil 3 Remake														
485
Resident Evil 4														
486
Resident Evil 4 Remake														
487
Resident Evil 6														
488
Resident Evil 7: Biohazard														
489
Resident Evil Village														
490
Resident Evil: Revelations 1														
491
Resident Evil: Revelations 2														
492
Retro Game Crunch														
493
Rise of the Tomb Raider														
494
RoadCraft														
495
RUSH: A Disney-PIXAR Adventure														
496
S.T.A.L.K.E.R.: Clear Sky														
497
Saints Row														
498
Saints Row: The Third Remastered														
499
Salt and Sanctuary														
500
Scars Above														
501
Sea of Thieves														
502
Sekiro™: Shadows Die Twice														
503
Serious Sam 4														
504
Shadow of the Tomb Raider														
505
Shadow Warrior														
506
Shadow Warrior 2														
507
Shadow Warrior 3: Definitive Edition														
508
Shin Megami Tensei III: Nocturne HD Remaster														
509
Shin Megami Tensei V: Vengeance + DLC
510
SHINOBI: Art of Vengeance DELUXE														
511
Sherlock Holmes: Nemesis														
512
Sherlock Holmes: The Awakened														
513
Sherlock Holmes: The Secret of the Silver Earring														
514
Sid Meier's Civilization IV														
515
Sid Meier's Civilization VII														
516
Shotgun King: The Final Checkmate														
517
Satisfactory														
518
Silent Hill F														
519
Silent Hill 2														
520
Silent Hill: Homecoming														
521
Skate Story														
522
Tony Hawk's™ Pro Skater™ 1 + 2														
523
Skater XL														
524
Starfield														
525
Sleeping Dogs														
526
Sleeping Dogs: Definitive Edition														
527
Slender: The Arrival														
528
Slime Rancher														
529
Sniper Elite 3														
530
Sniper Elite 4														
531
Sniper Elite 5														
532
Sniper Elite: Resistance														
533
SOMA														
534
Sonic Adventure DX														
535
Sonic Frontiers + DLC
536
Sonic Generations														
537
Sonic Mania														
538
Sonic Origins Plus														
539
Sonic Racing: CrossWorlds + DLC
540
Sonic Superstars + DLC
541
Sonic The Hedgehog 4- Episode I														
542
Sonic the Hedgehog 4 - Episode II														
543
Sonic X Shadow Generations + DLC
544
SOULCALIBUR VI														
545
SnowRunnner														
546
Samurai Shodown														
547
Soundpad														
548
SOUTH PARK: SNOW DAY!														
549
South Park: The Stick of Truth														
550
Space Engine														
551
Spider Man: 2														
552
Spider Man: Remastered														
553
Spider Man: Miles Morales														
554
SpongeBob SquarePants: Battle for Bikini Bottom														
555
Split Fiction														
556
Stardew Valley														
557
State of Decay: Year One Survival Edition														
558
STEINS;GATE: Linear Bounded Phenogram														
559
Stellaris														
560
Stick Fight: The Game														
561
Supermarket Simulator														
562
Super Bunny Man														
563
Stray														
564
Stray														
565
Street Fighter IV														
566
Street Fighter V														
567
Street Fighter VI														
568
Street Fighter X Tekken														
569
Strider														
570
Stronghold 2														
571
Subnautica														
572
Subnautica: Below Zero														
573
Subnautica 2														
574
SUCCUBUS														
575
Tales of Arise														
576
Team Fortress 2														
577
Team Fortress Classic														
578
Team Sonic Racing														
579
TEKKEN 7														
580
Terminator: Resistance														
581
Terraria														
582
The Amazing Spider-Man														
583
The Amazing Spider-Man 2														
584
The Ascent														
585
The Binding of Isaac														
586
The Binding of Isaac: Rebirth														
587
The Caligula Effect: Overdose														
588
The Dark Pictures Anthology: Man of Medan														
589
The Elder Scrolls III: Morrowind														
590
The Elder Scrolls V: Skyrim														
591
The Elder Scrolls V: Skyrim Special Edition														
592
The Escapists														
593
The Evil Within														
594
The Evil Within 2														
595
The Forest														
596
The Guest														
597
THE KING OF FIGHTERS '97 GLOBAL MATCH														
598
THE KING OF FIGHTERS '98 ULTIMATE MATCH														
599
THE KING OF FIGHTERS 2002 UNLIMITED MATCH														
600
THE KING OF FIGHTERS XIII STEAM EDITION														
601
THE KING OF FIGHTERS XIV STEAM EDITION														
602
The Long Dark														
603
The Mortuary Assistant														
604
The Outer Worlds														
605
The Room														
606
The Room Three														
607
The Room Two														
608
The Sinking City Remastered														
609
The Stanley Parable														
610
The Surge														
611
The Talos Principle 2														
612
The Typing of The Dead: Overkill														
613
THE LAST OF US 1 REMASTERED														
614
THE LAST OF US 2 REMASTERED														
615
The Walking Dead														
616
The Walking Dead: A New Frontier														
617
The Walking Dead: Michonne - A Telltale Series														
618
The Walking Dead: Season Two														
619
The Walking Dead: The Final Season														
620
The Wild Eight														
621
The Witcher 2: Assassins of Kings Enhanced Edition														
622
The Witcher 3: Wild Hunt														
623
The Witcher: Enhanced Edition														
624
The Wolf Among Us														
625
The Hunter: Call of the Wild														
626
Thief Simulator														
627
This War of Mine														
628
TOGETHER BnB														
629
Tomb Raider														
630
Tomb Raider (VI): The Angel of Darkness														
631
Tomb Raider II														
632
Tomb Raider III														
633
Tomb Raider: Legend														
634
Tomb Raider: Underworld														
635
Torchlight II														
636
Total War: ATTILA														
637
Total War: NAPOLEON - Definitive Edition														
638
Total War: ROME REMASTERED														
639
Total War: WARHAMMER														
640
Totally Accurate Battle Simulator														
641
Toy Story 3: The Video Game														
642
Train Simulator Classic														
643
Trine														
644
Trine 2														
645
Tropico 4														
646
Tropico 5														
647
Tropico 6														
648
Twelve Minutes														
649
Two Worlds II HD														
650
Ultimate Chicken Horse														
651
Ultra Street Fighter IV														
652
ULTRAKILL														
653
Undertale														
654
Until Dawn														
655
Unpacking														
656
Untitled Goose Game														
657
Vanquish														
658
Victoria 3														
659
Victoria II														
660
Visage														
661
Viscera Cleanup Detail														
662
Windrose														
663
Wallpaper Engine														
664
Warhammer 40,000: Inquisitor - Martyr														
665
Wasteland 1 - The Original Classic														
666
Wasteland 3														
667
We Happy Few														
668
We Were Here Too														
669
White Day: A Labyrinth Named School														
670
Wolfenstein II: The New Colossus														
671
Wolfenstein: The New Order														
672
Wolfenstein: The Old Blood														
673
Wolfenstein: Youngblood														
674
Wo long: fallen dynasty														
675
World War Z														
676
Wreckfest														
677
X4: Foundations														
678
XCOM 2														
679
XCOM: Enemy Unknown														
680
Yaiba: Ninja Gaiden Z														
681
Yakuza 0														
682
Yakuza 3 Remastered														
683
Yakuza 4 Remastered														
684
Yakuza 5 Remastered														
685
Yakuza Kiwami														
686
Yakuza Kiwami 2														
687
Yakuza: Like a Dragon														
688
Zombie Army Trilogy														
689
Dragon Ball Sparking Zero														
690
Dragon Ball KAKAROT														
691
Dragon Ball XENOVERSE 2														
692
THE LAST OF US 1														
693
THE LAST OF US 2 REMASTERED`;

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const lines = rawText.split('\n');
const extracted = [];
lines.forEach(line => {
  const parts = line.split('\t');
  parts.forEach(p => {
    let cleaned = p.trim();
    if (!cleaned) return;
    if (cleaned.startsWith('$') || /^\d+$/.test(cleaned)) return;
    if (cleaned.includes('JUEGOS DISPONIBLES') || cleaned.includes('SE VENDEN APARTE') || cleaned.includes('NO DISPONIBLES')) return;
    if (cleaned === 'Steam' || cleaned === 'Electronic Arts' || cleaned === 'Ubisoft') return;
    cleaned = cleaned.replace(/\s+\$\d+[\d.,]*/g, '').trim();
    if (cleaned) extracted.push(cleaned);
  });
});

const map = new Map();
extracted.forEach(name => {
  const norm = normalize(name);
  if (!map.has(norm)) {
    map.set(norm, name);
  }
});

const finalItems = Array.from(map.values()).map(name => ({
  name: name,
  priceCLP: "4990",
  priceUSD: "5.54",
  pricePrimariaCLP: "4990",
  pricePrimariaUSD: "5.54",
  priceSecundariaCLP: "4990",
  priceSecundariaUSD: "5.54",
  plataforma: "Steam",
  genero: "Steam Promo",
  idioma: "Español / Multilenguaje",
  anio: "2026",
  comentario: "INCLUIDO EN PROMOS STEAM (3x $4.990 / 10x $9.990 / 23x $17.990)",
  tags: ["Steam", "Promo", "3x4990", "10x9990", "23x17990"],
  isSteamPromoEligible: true,
  stock: "1000",
  imageUrl: ""
}));

fs.writeFileSync(path.join(process.cwd(), 'src/assets/steam_import_data.json'), JSON.stringify(finalItems, null, 2), 'utf8');

console.log('Total extracted:', extracted.length);
console.log('Total unique games saved to steam_import_data.json:', finalItems.length);
