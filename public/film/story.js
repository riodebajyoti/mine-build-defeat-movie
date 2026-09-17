export const DURATION=18000;
export const CHAPTERS=[
 ['First light','A new morning','Mira','Welcome, traveler. We could use another pair of hands.'],
 ['The village','Meet the villagers','Bram','Five homes. Two guardians. One place worth protecting.'],
 ['The explorer’s camp','Find the lost beacon','Niko','An old beacon sleeps beyond the village. Follow me to the ruins.'],
 ['The ancient watchtower','Recover the buried relic','Bram','The watchtower kept a relic safe. We need it before nightfall.'],
 ['Crystal cavern','Search for the glowing crystal','Mira','The cavern shines with crystals. One could power our beacon.'],
 ['Willow farmstead','Meet the farmers','Niko','The farmers are waiting. Their animals need shelter too.'],
 ['Secrets of the ruins','Explore the old watchtower','Bram','These mossy walls remember a village older than ours.'],
 ['The harvest','Gather food for the village','Mira','Bring the harvest home. Everyone will need food tonight.'],
 ['The beacon returns','Bring the relics home','Niko','The relic and crystal are safe. Now we can return to the village.'],
 ['Last light','Return to the village','Bram','That is enough for today. Bring everyone home.'],
 ['Close the doors','Secure the village','Mira','Everyone inside. Stay away from the windows.'],
 ['The first rain','Take your position','Niko','You can hear them when the thunder stops.'],
 ['They are here','Defend the road','Bram','Do not let them reach the villagers.'],
 ['The eastern line','Hold the approach','Mira','The guardians are holding. Stay with them.'],
 ['Thunder','Fight through the storm','Niko','Another group! Beyond the well!'],
 ['No way back','Protect the shelter','Bram','We stand here. We keep this road.'],
 ['The breach','Push them back','Mira','Stay moving. You are still in this.'],
 ['One last stand','Survive the final waves','Niko','Just a little longer. We are right behind you.'],
 ['First light returns','Check on everyone','Mira','The storm has passed. Look at the sky.'],
 ['The second morning','Welcome a new day','Bram','Everyone is here. We made it through the night.']
].map((c,i)=>({start:i*900,title:c[0],objective:c[1],speaker:c[2],line:c[3]}));
export const chapterAt=t=>CHAPTERS[Math.min(CHAPTERS.length-1,Math.floor(Math.max(0,t)/900))];
export const clock=t=>[Math.floor(t/3600),Math.floor(t/60)%60,Math.floor(t)%60].map(x=>String(x).padStart(2,'0')).join(':');
