// Hardware ID and network ID: 0xc528100000584f80 on network 0x2777
// ^These are always the same

// I, [2015-07-13T20:06:15.137579 #84220]  INFO -- : 45w at 2015-07-13 20:06:01 -0700
// ^This is what the wattage line of data looks like

var shell = require('shelljs'),
    make = require('shelljs/make'),
    fs = require('fs');
    // watch = require('node-watch'); If necessary, can be used to execute function on file change

// Total wattage since start
var total = 0;
// Total is a test variable to show live data manipulation updates, in the future
// we'd want to either send updates with socket.io that are handled elsewhere or
// update some object on this end and send it periodically

// Grab wattage information from string
// It is used as the callback in the function readLines
var getWatts = function(string){
  var start = string.indexOf(': ')+2;
  var end = string.indexOf('w');
  var watts = string.slice(start, end);
  watts = parseInt(watts);
  if (end > 0){
    total += watts;
  }
  // console.log('string: ', string, ' total: ', total, ' start: ', start, ' end: ', end, ' watts: ', watts);
  console.log('total: ', total); // logs to server
  cbDone = true;
}

// If asynchronous issues arise, cbDone could be used to wait to execute a task
var cbDone = false;
// Input is defined in execute, it's equal to a live stream of data from data.txt
// FYI, no data is visible in data.txt because of the rapid turn over
var input;

// Executes callback (getWatts) with data.txt and then erases data.txt when done
// Called by fn execute
var readLines = function(input, cb) {
  // Stores data chunks
  var remaining = '';
  input.on('data', function(data) {
    remaining += data;
    // Index where read will end (end of a line in data.txt)
    var index = remaining.indexOf('\n');
    // Location to start reading in file (last read location, start of a line in data.txt)
    var last  = 0;
    // While there is more left to read
    while (index > -1) {
      // line is a string
      var line = remaining.substring(last, index);
      var length = line.length;
      // Only execute getWatts on lines that display watt use
      if (length > 74){
        cb(line);
      }
      // Update last read character to the end character of the line + 1
      last = index + 1;
      // Update end of line to end of line starting at last
      index = remaining.indexOf('\n', last);
    }
    // Update remaining to string starting at last
    remaining = remaining.substring(last);
  });
  // After file has been read to completion, check to make sure no new data
  // has come in
  input.on('end', function() {
    if (remaining.length > 0) {
      cb(remaining); // If new data, process
    }
    // Clear data.txt for incoming data
    fs.writeFile('data.txt', '', function(){console.log('ERASED DATA.TXT')});
  });
};

// Executes hardware query on CL > writes result to data.txt > initiates readLines
// Called by setInterval
var execute = function(command){
  shell.exec.apply(null, [command]);
  input = fs.createReadStream('data.txt', 'utf8');
  readLines(input, getWatts);
};

// Runs execute every 10s
setInterval(execute, 10000, 'hacklet read -n 0x2777 -s 0 >> data.txt | cat');

/*
Command to turn top socket on or off using ShellJS
shell.exec('hacklet on -n 0x2777 -s 0')
shell.exec('hacklet off -n 0x2777 -s 0')

Command to turn bottom socket on or off using ShellJS
shell.exec('hacklet on -n 0x2777 -s 1')
shell.exec('hacklet off -n 0x2777 -s 1')
*/
