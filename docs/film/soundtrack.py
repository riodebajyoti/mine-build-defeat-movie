"""Generate the original 300-second ambient soundtrack. Requires numpy."""
import numpy as np
import wave
from pathlib import Path
SR=48000
DURATION=300
rng=np.random.default_rng(3817)
out=Path(__file__).with_name('soundtrack.wav')
with wave.open(str(out),'wb') as wav:
 wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR)
 for second in range(DURATION):
  t=second+np.arange(SR)/SR
  night=np.clip((t-115)/20,0,1)*np.clip((280-t)/18,0,1)
  # Gentle minor pentatonic pad, opening into a major chord at dawn.
  root=110 if second<277 else 110
  chord=[1,1.2,1.5] if second<277 else [1,1.25,1.5]
  pad=sum(np.sin(2*np.pi*root*r*t+.18*np.sin(t*.23))*.023 for r in chord)
  pad*=.65+.35*np.sin(t*.18)**2
  wind=rng.normal(0,1,SR)
  wind=np.convolve(wind,np.ones(65)/65,mode='same')*(.08+.12*night)
  rain=rng.normal(0,1,SR)*.028*night
  # Low storm rumbles and a tightening pulse during the attack.
  thunder=np.zeros(SR)
  if 130<=second<275:
   q=np.mod(t-130,17.0)
   thunder=(np.sin(2*np.pi*42*t)+.4*np.sin(2*np.pi*57*t))*np.exp(-q*1.3)*.06
  if 145<=second<245:
   q=np.mod(t-145,.65)
   thunder+=np.sin(2*np.pi*58*t)*np.exp(-q*28)*.05
  beat=np.zeros(SR)
  # Quiet wood impacts during gathering and building, plus combat thumps.
  if 22<=second<122 or 145<=second<241:
   period=1.6 if second<122 else 2.0
   phase=np.mod(t,period)
   beat=np.exp(-phase*35)*np.sin(2*np.pi*(100 if second<122 else 62)*t)*.13
  birds=np.zeros(SR)
  if second<18:
   q=np.mod(t,3.7)
   birds=np.sin(2*np.pi*(1450*t+100*np.sin(t*8)))*np.exp(-q*12)*.023
  fade=np.minimum(np.clip(t/4,0,1),np.clip((300-t)/4,0,1))
  signal=(pad+wind+rain+beat+birds+thunder)*fade
  left=signal;right=(pad+wind*.85+rain*.9+beat+birds+thunder)*fade
  stereo=np.column_stack([left,right]);wav.writeframes((np.clip(stereo,-.9,.9)*32767).astype('<i2').tobytes())
print(out)
