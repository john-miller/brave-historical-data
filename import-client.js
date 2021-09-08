const fs = require('fs');
const request = require('sync-request');

const FgRed = '\x1b[31m';
const FgGreen = '\x1b[32m';
const Reset = '\x1b[0m';

const arguments = process.argv.slice(2, process.argv.length);

let username = null;
let password = null;
let host = null;

//TODO add help option
arguments.forEach(arg => {
    const argParts = arg.split('=');
    switch(argParts[0]) {
        case '-u':
            username = argParts[1];
            break;
        case '-p':
            password = argParts[1];
            break;
        case '-h':
            host = argParts[1];
            break;
        default:
            const output = `${FgRed}Invalid arg provided: ${arg}${Reset}\n`;
            process.stderr.write(output);
            process.exit(1);
    }
});

/* List of data directories to pull from with their corresponding import uris */
const dataDirs = [
    {
        fileDir: './data/brave-transparency',
        apiUrl: `imports/brave`
    }, 
    {
        fileDir: './data/reddit',
        apiUrl: `imports/reddit/stats`
    }
];

/* Construct basic auth string */
const basicAuth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

/* If all goes well, exit code will be zero */
let exitCode = 0;

/* Iterate over each data directory */
dataDirs.forEach(dir => {

    /* Get all the files in each directory */
    const files = fs.readdirSync(dir.fileDir, 'utf8');

    /* POST each file to it's corresponding import URL */
    files.forEach(file => {
        /* Read the data from the file on disk */
        const data = fs.readFileSync(`${dir.fileDir}/${file}`, 'utf8');
        
        /* Execute the POST request */
        const response = request(
            'POST', 
            `${host}/${dir.apiUrl}`,
            { 
                headers: {
                    'Authorization': basicAuth
                },
                body: data
            }
        );

        /* File has been successfully imported */
        if(response.statusCode === 200) {
            const output = `${FgGreen}Successfully imported ${dir.fileDir}/${file}${Reset}\n`;
            process.stdout.write(output);
        } 

        /* Probably means the file has been imported already so it's ok to skip over this */
        else if (response.statusCode === 400) {
            const output = `${FgRed}Already imported ${dir.fileDir}/${file}${Reset}\n`;
            process.stdout.write(output);
        }

        /* Something wen't wrong, we'll mark the job as not successful */
        else {
            const output = `${FgRed}Could not import ${dir.fileDir}/${file}${Reset}\n`;
            process.stderr.write(output);
            process.stderr.write(response.body);
            process.stderr.write('\n');
            /* If there are any errors, the script will return 1 */
            exitCode = 1;
        }
    });
});

/* Exit the program */
process.exit(exitCode);

