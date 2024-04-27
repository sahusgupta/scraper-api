const express = require('express');
const app = express();

const { login, getAverages, getAssignments, getTranscript, getRegistration  } = require('./index.js');

//averages endpoint
app.get('/averages/:user/:pass/:link/:sw', async (req, res) => {
    console.log(req.params);
    const { user, pass, link, sw } = req.params;

    if (!user || !pass || !link || !sw) {
        return res.status(400).json({ message: "Invalid parameters" });
    }

    console.log("Attempting login with provided credentials.");

    try {
        const fullLink = "https://" + link;
        const [page, browser, success] = await login(user, pass, fullLink);
        if (success) {
            console.log("login success! fetching avg now")
            const averages = await getAverages(browser,fullLink, sw);
            console.log(averages);
            await browser.close(); 
        }

        await browser.close(); //close the browser

    } catch (error) {
        console.error("Error fetching averages: ", error.message);
        res.status(500).json({ message: error.message });
    }
});

//assignments endpoint
app.get('/assignments/:user/:pass/:link/:sw', async (req, res) => {
    console.log(req.params);
    const { user, pass, link, sw } = req.params;

    if (!user || !pass || !link || !sw) {
        return res.status(400).json({ message: "Invalid parameters" });
    }

    console.log("Attempting login with provided credentials.");
    try {
        const fullLink = "https://" + link;
        const [page, browser, success] = await login(user, pass, fullLink);
        if (success) {
            console.log("login success! fetching assignments now")
            const assignments = await getAssignments(browser,fullLink, sw);
            res.send(assignments);
            await browser.close(); 
        }

        await browser.close(); //close the browser
    } catch (error) {
        console.error("Error fetching assignments: ", error.message, error.stack);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});

//transcripts endpoint
app.get('/transcript/:user/:pass/:link', async (req, res) => {
    console.log(req.params);
    const { user, pass, link} = req.params;

    if (!user || !pass || !link) {
        return res.status(400).json({ message: "Invalid parameters" });
    }

    console.log("Attempting login with provided credentials.");
    try {
        const fullLink = "https://" + link;
        const [page, browser, success] = await login(user, pass, fullLink);
        if (success) {
            console.log("login success! fetching transcript now")
            const transcript = await getTranscript(browser, fullLink);
            res.send(transcript);
            await browser.close(); 
        }

        await browser.close(); //close the browser
    } catch (error) {
        console.error("Error fetching transcript: ", error.message, error.stack);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});
app.get('/main/:user/:pass/:link', async (req, res) => {
    console.log(req.params);
    const { user, pass, link } = req.params;

    if (!user || !pass || !link) {
        return res.status(400).json({ message: "Invalid parameters" });
    }

    console.log("Attempting login with provided credentials.");
    try {
        const fullLink = "https://" + link;
        const [page, browser, success] = await login(user, pass, fullLink);
        if (success) {
            console.log("login success! fetching assignments now")
            const assignments = await getRegistration(browser,fullLink);
            res.send(assignments);
            await browser.close(); 
        }

        await browser.close(); //close the browser
    } catch (error) {
        console.error("Error fetching: ", error.message, error.stack);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});
//Testing app
const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
