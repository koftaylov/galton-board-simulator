# Visualization Ideas

## Backlog
### todo
- [x] add toggle to work in background when window is not in focus. currently it do nothing if it's not visible, I want it continue work if I select another tab or window.
- [x] add toggle to show data labes for current run: Off, Balls, Ratio%. Place in in new line. they Balls and Ratio% are selected by default.
- [x] add button in top left corner to hide left pape with settings. pane with pegs and balls shall move to center of page after hiding left pane. left settings pane is shown by defailt.
- [x] make balles disappear once they touch top of histogram (or place where it would be if it's turned off)
- [x] currently balls appear right on top of top peg or something, make it appear a bit above so they fall down to first peg. 
- [x] when I click Sticky in modes I do not want it make sticky  balls on last level
- [x] if it's possible and it's easy to do - make left pane scrollable, so if there more settings I can scroll it but pegs and balls always on it's place
- [x] add toggle Show buckets (place it on new line and combine with Show bars one, make Off, Buckets, Bars). Off show no histogram, Bars show histogram, Buckets show kind of bucket - rectangles with left, bottom and right sides and balls falling in them and are keeping be there overlapping a bit, so it looks like ther era balls in glass. more balls - heiher stack.
- [ ] Gravity and bounce style: add feel presets such as floaty, heavy, pinball, and marble. add one chose toggle: Simple, Gravity.

- [ ] design way to publish it in website, ideally with github ci/cd (will it work in free account?). do not implement, just discuss it and make a plan.


### nice to have

- [x] Turn coloring: left turns tint the ball one color, right turns another, with the final ball color becoming a blended path fingerprint.
- [x] Path sonification: left and right bounces play different tones so each ball path becomes a small melody.
- [ ] Wildcard obstacles: add special pegs with unusual behavior such as Mirror, Magnet, Repeller, Teleporter, Splitter, Sticky, and Chaos.
  - [x] Add wildcard selector UI with checkboxes for each type and a random Wildcard option.
  - [x] Color wildcard obstacle pegs for debugging and readability.
  - [x] Implement Mirror: flips the chosen left/right direction.
  - [x] Implement Magnet: pulls balls toward the center.
  - [x] Implement Repeller: pushes balls away from the center.
  - [x] Implement Teleporter: jumps balls to another valid peg/path position.
  - [x] Implement Splitter: duplicates a ball into two paths.
  - [x] Implement Sticky: slows a ball temporarily after contact.
  - [x] Implement Chaos: ignores current bias and chooses randomly.
  - [x] Implement Wildcard: randomly chooses one enabled wildcard behavior.
  - [ ] Tune wildcard density and placement rules.
  - [ ] Add visual/audio feedback when a wildcard activates.
- [x] Add button Pause to pause execution. Button Stop shell stop execution and remove all balls and pathes.
- [x] Do not save path if it is not turned on from very beginning.
- [x] Peg types and board editor: click pegs to cycle between normal, magnet, mirror, splitter, blocker, or other behaviors.
- [x] Ghost distribution overlay: draw the expected binomial or normal curve behind the histogram.
- [ ] Deviation mode: color bars based on whether each bucket is above or below its expected count.
- [ ] Ball families: assign each ball a family or color based on its first turn and track how early choices shape outcomes.
- [ ] Replay one ball: click a bucket or path to replay a single ball journey slowly with its turn sequence.
- [ ] Bias timeline: allow right-bias probability to change over time, such as sweeping from 20% to 80% during a run.
- [ ] Wind mode: add a sideways force that nudges all balls, optionally oscillating over time.
- [ ] Gravity and bounce style: add feel presets such as floaty, heavy, pinball, and marble.
- [ ] Soundscape mode: give each bucket a note so landed balls create chords based on the distribution.
- [ ] Compare runs: save the current histogram as a faint background and compare it against a new run.
- [ ] Target challenge: pick a target bucket and adjust bias or wildcard pegs to maximize hits there.
- [ ] Entropy meter: display how spread out the distribution is and how bias or wildcards change it.
- [ ] Path density fog: accumulate trails into a soft glowing density field where common routes become brighter.
- [ ] Bucket personalities: give buckets distinct colors, sounds, or labels, with rare outer buckets triggering special effects.
- [ ] Slow-motion inspector: pause and scrub the simulation frame by frame.
- [ ] Mutation mode: every N balls, one random peg changes behavior so the board evolves during the run.
- [x] replace checkboxes with multioption toggle style.
- [x] Add mode "No vis" - launch all balls without visualisation of balls
- [x] Add toggle and mode for saving previous stats - after finish each run draw linechart of fact distribution (pale colour), this linechart shall stay on screen until I click Clear. 
- [x] Add second line of data labels with average across data from stats.
- [x] Fix - does not stop if several run with No vis mode
- [x] Fix - balls do not bounce properly on last level, after touching it moves directly to basket.
- [x] Fix - look like Chaos doesn't work at all on last level, if right bias = 100 and most right peg on last level is teleport and all the rest pegs on last level is chaos balls always select right.
- [x] Fix - looks like histogram y-axis works by values, not %. once chane amount of balls scale of histogrm changes. it should use % so scalse the same for 10 and 10K balls.
- [ ] Collisions mode - allow balls to collide with each other 

- [ ] Combine wildcard pegs, path sonification, and heatmap trails into a probability instrument mode.




## Bugs
- [x] balls slows down after last level, I want them falling with the same speed
- [x] scalse of stats (bars and lines) are changeing while balls are reaching buckets. I believe because it use the same scale as current run histogram, so if max of stat is 30% and max of histogram after first ball is 100% the scale for both charts and adjusted to 100% and that's why stats chart "moving". can we have different scales for stats and histogram?
- [x] if I change mode to No vis after simulation already began it stops to launching new balls, already launched balls fall down and nothing happens next. I have to click Simulate again, which breaks flow. I woulsd like to change mode seamless
