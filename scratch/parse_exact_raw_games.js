const fs = require('fs');
const path = require('path');

const rawText = `3DMark	Battlefield 3™	Anno 1800	
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
Sniper Elite: Resistance
54
Borderlands: The Pre-Sequel							
Sonic Colors Ultimate
55
Bright Memory							
Sonic Frontiers + DLC
56
Bright Memory: Infinite							
Sonic Superstars + DLC
57
Broforce							
Sonic X Shadow Generations + DLC
58
Brothers: A Tale of Two Sons							
Soul Hackers 2 + DLC
59
Bus Simulator 18							
Stranded Alien Dawn
60
Clair Obscur: Expedition 33							
Stellar Blade Complete Edition
61
Call of Duty (2003)							
Star Wars Outlaws + DLC | SWO
62
Call of Duty 2							
SUPER ROBOT WARS Y
63
Call of Duty: Black Ops							The Bus							
64
Call of Duty: Black Ops II							
The First Berserker: Khazan + DLC
65
Call of Duty: Black Ops III							
Two Point Campus
66
Call of Duty: United Offensive							
Two Point Museum
67
Call of Duty: Modern Warfare 2							Pragmata							
68
Call of Duty: Ghost							Forza Horizon 6					
69
Call of Duty: World at War							
SOLO LEVELING ARISE
70
Call of Juarez							
Warhammer Age of Sigmar: Realms of Ruin
71
Call to Arms - Gates of Hell: Ostfront							
Warhammer Chaos Gate - Daemonhunters
72
Car Mechanic Simulator 2015							Wild Hearts							
73
Car Mechanic Simulator 2021							
Forza Horizon 5 (CON ONLINE)
74
Castlevania: Lords of Shadow - Ultimate Edition							
Total warhamer 3 +dlc
75
Cat Quest							
Yakuza Kiwami 3
76
Celeste							F1 23							
77
Cities in Motion 2							F1 24							
78
Cities: Skylines							
Construction simulator
79
Cloudpunk							Dirt 5							
80
Company of Heroes 2							
Mafia The Old Country
81
Contraband Police							
Street Fighter 6
82
Control Ultimate Edition							Undisputed							
83
Counter-Strike: Condition Zero Deleted Scenes							Life is Strange: Reunion					
84
Counter-Strike: Source							Mega Man Star Force Legacy Collection					
85
Crash Bandicoot™ N. Sane Trilogy							
LEGO® Batman™: El Legado del Caballero Oscuro
86
Crashlands							
007 First Light
87
Crime Scene Cleaner							
Halo Campaign evolved
88
Cairn							
007 First Light
89
Crimson Desert														
90
Crusader Kings III														
91
Clover Pit														
92
Cuphead														
93
Death Stranding														
94
Death Stranding 2														
95
Crysis Remastered														
96
Crysis 2 Remastered														
97
Crysis 3 Remastered														
98
Cyberpunk 2077														
99
Deltarune														
100
Danganronpa 2: Goodbye Despair														
101
Danganronpa Another Episode: Ultra Despair Girls														
102
Danganronpa V3: Killing Harmony														
103
Danganronpa: Trigger Happy Havoc														
104
DARK SOULS II: Scholar of the First Sin														
105
DARK SOULS III														
106
DARK SOULS: REMASTERED														
107
Dark Souls II														
108
Darkest Dungeon														
109
Darkest Dungeon II
110
Darksiders II: Deathinitive Edition														
111
Darksiders III														
112
Darksiders: Warmastered Edition														
113
Dawn of Man														
114
Day of Defeat														
115
Day of Defeat: Source												
116
Days Gone														
117
Dispatch														
118
Dave the diver														
119
Dead Cells														
120
Dead Island 2															
121
Dead Island: Definitive Edition														
122
Dead Island: Riptide Definitive Edition														
123
DEAD OR ALIVE 6														
124
DEAD OR ALIVE Xtreme Venus Vacation														
125
DEAD RISING														
126
Dead Rising 2														
127
Dead Rising 2: Off the Record														
128
Dead Rising 3: Apocalypse Edition														
129
Dead Rising 4														
130
Dead Space (2008)														
131
Dead Space Remake														
132
Dead Space 3														
133
Demon Slayer Sweep the Board! | DSSB														
134
Demon Slayer The Hinokami Chronicles
135
Demon Slayer The Hinokami Chronicles II														
136
DESOLATE														
137
Desperados 2														
138
Desperados III														
139
Desperados: Wanted Dead or Alive														
140
Destroy All Humans!														
141
Detroit: Become Human														
142
Deus Ex: Mankind Divided														
143
Devil May Cry 3: Special Edition														
144
Devil May Cry 4: Special Edition														
145
Devil May Cry 5														
146
Devil May Cry HD Collection														
147
DIRT 2														
148
DIRT 4														
149
DIRT Rally 2.0														
150
Dishonored														
151
Dishonored 2														
152
Dishonored: Death of the Outsider														
153
Disneyland Adventures														
154
DmC: Devil May Cry														
155
Don't Starve Together														
156
DOOM (2016)														
157
DOOM Eternal														
158
DOOM: The Dark Ages														
159
DOOM I & II														
160
Door Kickers 2														
161
DRAGON BALL XENOVERSE														
162
DRAGON BALL XENOVERSE 2														
163
Dragon Ball Sparking Zero														
164
DRAGON BALL Z: KAKAROT														
165
DRAGON QUEST BUILDERS™ 2														
166
DRAGON QUEST HEROES II														
167
Dragon's Dogma: Dark Arisen														
168
DreadOut														
169
DreadOut 2														
170
Drug Dealer Simulator														
171
Dying Light														
172
Dying Light: The Beast														
173
DYSMANTLE														
174
Elden Ring + DLC														
175
Enshrouded														
176
Escape Simulator														
177
Escape the backrooms														
178
Euro Truck Simulator 2														
179
Europa Universalis IV														
180
EVERSPACE														
181
EVERSPACE™ 2														
182
Evil West														
183
Exit the Gungeon														
184
Forza Horizon 4
185
Forza Horizon 5														
186
Forza Horizon 6														
187
F.E.A.R. 3														
188
Factorio														
189
FAIRY TAIL														
190
Fallout														
191
Fallout 2														
192
Fallout 3 (REQUIERE FIX)														
193
Fallout 3 - Game of the Year Edition														
194
Fallout Tactics														
195
Fallout: New Vegas														
196
FAR Changing Tides														
197
FAR: Lone Sails														
198
Farming Simulator 17														
199
Farming Simulator 19														
200
Farming Simulator 25														
201
FINAL FANTASY I														
202
FINAL FANTASY II														
203
FINAL FANTASY III														
204
FINAL FANTASY IV														
205
FINAL FANTASY V														
206
FINAL FANTASY VI														
207
FINAL FANTASY VII REBIRTH														
208
FINAL FANTASY VII REMAKE INTERGRADE														
209
FINAL FANTASY VIII														
210
FINAL FANTASY IX														
211
FINAL FANTASY X														
212
FINAL FANTASY TYPE-0 HD														
213
FINAL FANTASY X/X-2 HD Remaster														
214
FINAL FANTASY XI														
215
FINAL FANTASY XII														
216
FINAL FANTASY XIII														
217
FINAL FANTASY XII THE ZODIAC AGE														
218
FINAL FANTASY XIII-2														
219
FINAL FANTASY XIV Online														
220
FINAL FANTASY XV WINDOWS EDITION														
221
Firefight														
222
Firewatch														
223
Fireworks Mania														
224
Five Nights at Freddy's														
225
Five Nights at Freddy's 2														
226
Five Nights at Freddy's 3														
227
Five Nights at Freddy's 4														
228
FIVE NIGHTS AT FREDDY'S: HELP WANTED														
229
Five Nights at Freddy's: Security Breach														
230
Five Nights at Freddy's: Sister Location														
231
Flashing Lights														
232
FlatOut 2														
233
FlatOut 4: Total Insanity														
234
Forager														
235
Frostpunk														
236
Game Dev Tycoon														
237
Gang Beasts														
238
Garfield Kart														
239
Garry's Mod														
240
Gears of War: Reloaded														
241
Gears 5														
242
Geometry Dash														
243
Getting Over It with Bennett Foddy														
244
Ghostrunner														
245
Goat Simulator														
246
Goat Simulator 3														
247
God of War														
248
God of War Ragnarok														
249
Golf It														
250
Gothic 1 Classic														
251
Gothic II: Gold Classic														
252
Grand Theft Auto III														
253
Grand Theft Auto IV: The Complete Edition														
254
Grand Theft Auto: San Andreas														
255
Grand Theft Auto: Vice City														
256
Grainy														
257
GreedFall														
258
Ghost of Tsushima														
259
Green Hell														
260
GRID 2														
261
GRID Autosport														
262
GROUND BRANCH														
263
Grounded														
264
Gunsmith Simulator														
265
Guts and Glory														
266
Hades														
267
Hades II														
268
Half-Life 2														
269
Half-Life: Alyx														
270
Half-Life: Blue Shift														
271
Half-Life: Opposing Force														
272
Half-Life: Source														
273
Halo: Spartan Assault														
274
Hatsune Miku: Project DIVA + DLC
275
Hearts of Iron IV														
276
Heavy Rain														
277
Hello Neighbor														
278
Hello Neighbor: Hide and Seek														
279
Hidden Deep														
280
Hitman 2: Silent Assassin														
281
Hi-Fi Rush														
282
Hitman: Absolution														
283
Hitman: Blood Money														
284
Hitman: Codename 47														
285
Hitman: Contracts														
286
HITMAN World of Assassination														
287
HITMAN™ 2														
288
Hogwarts Legacy														
289
Hollow Knight														
290
Hollow knight: Silksong														
291
Home Sweet Home														
292
Home Sweet Home EP2														
293
Horizon Zero Dawn™ Complete Edition														
294
Horizon Forbidden West™ Complete Edition														
295
Hotline Miami														
296
Hotline Miami 2: Wrong Number														
297
House Flipper														
298
Human: Fall Flat														
299
HUMANKIND														
300
It Takes Two														
301
inzoi														
302
I Am Alive														
303
Injustice 2														
304
Injustice: Gods Among Us Ultimate Edition														
305
INSIDE														
306
Is this seat taken														
307
Jotun: Valhalla Edition														
308
Journey														
309
JDM: Japanese Drift Master														
310
JUMP FORCE														
311
Jurassic World Evolution														
312
Jurassic World Evolution 2 + DLC
313
Jurassic World Evolution 3 + DLC
314
Just Cause														
315
Just Cause 2														
316
Just Cause 3														
317
Just Cause 4: Reloaded														
318
Kane & Lynch 2: Dog Days														
319
Katana ZERO														
320
Kenshi														
321
Kerbal Space Program														
322
Kerbal Space Program 2														
323
Kerbal Space Program: Breaking Ground Expansion														
324
Killing Floor 2														
325
Kingdom Come: Deliverance														
326
Kingdom Come: Deliverance II														
327
Kingdom Rush - Tower Defense														
328
Kingdom: Two Crowns														
329
KINGDOM HEARTS -HD 1.5+2.5 ReMIX-														
330
KINGDOM HEARTS HD 2.8 Final Chapter Prologue														
331
KINGDOM HEARTS III + Re Mind (DLC)														
332
KovaaK's														
333
Left 4 Dead														
334
Left 4 Dead 2														
335
LEGO Batman 2: DC Super Heroes														
336
LEGO Batman 3: Beyond Gotham														
337
LEGO City Undercover														
338
LEGO Harry Potter: Years 5-7														
339
LEGO Jurassic World														
340
LEGO MARVEL's Avengers														
341
LEGO The Hobbit														
342
LEGO The Lord of the Rings														
343
LEGO Worlds														
344
LEGO® Batman™: The Videogame														
345
LEGO® DC Super-Villains														
346
LEGO® MARVEL Super Heroes														
347
LEGO® MARVEL Super Heroes 2														
348
LEGO® Star Wars™ III: The Clone Wars™														
349
LEGO® Star Wars™: The Complete Saga														
350
LEGO® Star Wars™: The Skywalker Saga														
351
LEGO® The Incredibles														
352
LEGO® Indiana Jones™: The Original Adventures														
353
Lethal Company														
354
Life is Strange: Before the Storm														
355
Life is Strange Reunion														
356
Lies of P + DLC														
357
Like A Dragon Gaiden: T.M.W.E.H.N														
358
Like A Dragon: Infinite Wealth + DLC
359
Like A Dragon: Ishin! + DLC
360
Like a Dragon: P.Y.I.H (Deluxe Edition)														
361
LIMBO														
362
Little Nightmares														
363
Little Nightmares II														
364
Lossless Scaling														
365
Lost Judgement + DLC
366
Lost Planet 2														
367
Mount & Blade II: Bannerlord														
368
Mad Max														
369
Mafia														
370
Mafia II (Classic)														
371
Mafia II: Definitive Edition														
372
Mafia III: Definitive Edition														
373
Mafia: Definitive Edition														
374
Maid of Sker														
375
Marvel's Guardians of the Galaxy														
376
Mafia: el viejo continente
377
Marvel's Midnight Suns														
378
Max Payne														
379
Max Payne 2														
380
Max Payne 3														
381
METAL GEAR RISING: REVENGEANCE														
382
METAL GEAR SOLID V: GROUND ZEROES														
383
METAL GEAR SOLID Δ: SNAKE EATER														
384
METAL GEAR SURVIVE														
385
Megabonk														
386
Mewgenics														
387
METAL SLUG														
388
Metaphor: ReFantazio + DLC
389
Metro 2033														
390
Metro 2033 Redux														
391
Metro: Exodus														
392
Middle-earth: Shadow of Mordor														
393
Middle-earth: Shadow of War														
394
Monster Hunter Wilds														
395
Monster Hunter: World														
396
Mortal Kombat 11														
397
Mortal Kombat X														
398
My Friend Pedro														
399
My Summer Car														
400
My Time at Portia														
401
NARUTO SHIPPUDEN: Ultimate Ninja STORM 2														
402
NARUTO SHIPPUDEN: Ultimate Ninja STORM 3 Full Burst														
403
NARUTO SHIPPUDEN: Ultimate Ninja STORM 4														
404
NARUTO SHIPPUDEN: Ultimate Ninja STORM Revolution														
405
NARUTO: Ultimate Ninja STORM														
406
Neon Abyss														
407
Ni no Kuni™ II: Revenant Kingdom														
408
NieR: Automata														
409
NieR Replicant														
410
Nioh: Complete Edition														
411
Nioh 2														
412
Nioh 3																
413
Nocturnals														
414
Notia														
415
UNCHARTED™: Colección Legado de los Ladrones														
416
ONE PIECE ODYSSEY														
417
ONE PIECE: World Seeker														
418
ONE PUNCH MAN: A HERO NOBODY KNOWS														
419
One Piece: Unlimited World Red - Deluxe Edition														
420
Onimusha 2: Samurai's Destiny														
421
Operator														
422
Ori and the Blind Forest														
423
Ori and the Blind Forest: Definitive Edition														
424
Ori and the Will of the Wisps														
425
Osteya														
426
Outcast - A New Beginning														
427
Outer Wilds														
428
Outlast														
429
Outlast 2														
430
Overcooked														
431
Overcooked! 2														
432
Overgrowth														
433
Oxygen Not Included														
434
Pragmata														
435
Pacify														
436
Papers, Please														
437
PAYDAY 2														
438
PC Building Simulator														
439
Peggle Deluxe														
440
Persona 3 Portable														
441
Persona 3 Reload + Aigis DLC
442
Persona 4 Arena Ultimax														
443
Persona 4 Golden														
444
Persona 5 Royal														
445
Persona 5 Strikers														
446
Persona 5 Tactica + DLC
447
Phasmophobia														
448
Phoenix Wright: Ace Attorney Trilogy														
449
Pikuniku														
450
Plague Inc: Evolved														
451
Planet Coaster 2														
452
Police Simulator: Patrol Officers														
453
Poly Bridge														
454
Poly Bridge 2														
455
Portal														
456
Portal 2														
457
Possessed														
458
POSTAL 4: No Regerts														
459
POSTAL Redux														
460
Postal 3														
461
Prey														
462
Prison Simulator														
463
Project Zomboid														
464
Psychonauts 2														
465
Quantum Break														
466
Radiation Island														
467
Raft														
468
RAIDOU Remastered: TMSA														
469
Rain World														
470
Rayman: Raving Rabbids														
471
Ready or Not														
472
Red Dead Redemption 1														
473
Red Dead Redemption 2														
474
Redfall														
475
Remember Me														
476
Ratchet & Clank: Una dimensión aparte														
477
Rimworld														
478
Returnal														
479
Resident Evil 0														
480
Resident Evil 2 Remake														
481
Resident Evil 3 Remake														
482
Resident Evil 4														
483
Resident Evil 4 Remake														
484
Resident Evil 6														
485
Resident Evil 7: Biohazard														
486
Resident Evil Village														
487
Resident Evil: Revelations 1														
488
Resident Evil: Revelations 2														
489
Retro Game Crunch														
490
Rise of the Tomb Raider														
491
RoadCraft														
492
RUSH: A Disney-PIXAR Adventure														
493
S.T.A.L.K.E.R.: Clear Sky														
494
Saints Row														
495
Saints Row: The Third Remastered														
496
Salt and Sanctuary														
497
Scars Above														
498
Sea of Thieves														
499
Sekiro™: Shadows Die Twice														
500
Serious Sam 4														
501
Shadow of the Tomb Raider														
502
Shadow Warrior														
503
Shadow Warrior 2														
504
Shadow Warrior 3: Definitive Edition														
505
Shin Megami Tensei III: Nocturne HD Remaster														
506
Shin Megami Tensei V: Vengeance + DLC
507
SHINOBI: Art of Vengeance DELUXE														
508
Sherlock Holmes: Nemesis														
509
Sherlock Holmes: The Awakened														
510
Sherlock Holmes: The Secret of the Silver Earring														
511
Sid Meier's Civilization IV														
512
Sid Meier's Civilization VII														
513
Shotgun King: The Final Checkmate														
514
Satisfactory														
515
Silent Hill F														
516
Silent Hill 2														
517
Silent Hill: Homecoming														
518
Skate Story														
519
Tony Hawk's™ Pro Skater™ 1 + 2														
520
Skater XL														
521
Starfield														
522
Sleeping Dogs														
523
Sleeping Dogs: Definitive Edition														
524
Slender: The Arrival														
525
Slime Rancher														
526
Sniper Elite 3														
527
Sniper Elite 4														
528
Sniper Elite 5														
529
Sniper Elite: Resistance														
530
SOMA														
531
Sonic Adventure DX														
532
Sonic Frontiers + DLC
533
Sonic Generations														
534
Sonic Mania														
535
Sonic Origins Plus														
536
Sonic Racing: CrossWorlds + DLC
537
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

const lines = rawText.split('\n');
const allGames = [];

lines.forEach(line => {
  const parts = line.split('\t');
  parts.forEach(p => {
    let cleaned = p.trim();
    if (!cleaned) return;
    if (cleaned.startsWith('$') || /^\d+$/.test(cleaned)) return;
    if (cleaned.includes('JUEGOS DISPONIBLES') || cleaned.includes('SE VENDEN APARTE') || cleaned.includes('NO DISPONIBLES')) return;
    if (cleaned === 'Steam' || cleaned === 'Electronic Arts' || cleaned === 'Ubisoft') return;
    cleaned = cleaned.replace(/\s+\$\d+[\d.,]*/g, '').trim();
    if (cleaned) {
      allGames.push(cleaned);
    }
  });
});

console.log('Total juegos extraídos exactamente en orden sin desduplicar:', allGames.length);

const steamDataItems = allGames.map(name => ({
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

fs.writeFileSync(path.join(process.cwd(), 'src/assets/steam_import_data.json'), JSON.stringify(steamDataItems, null, 2), 'utf8');
console.log('Guardado src/assets/steam_import_data.json con', steamDataItems.length, 'juegos.');
