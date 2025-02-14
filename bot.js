const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const readlinkSync = require('readline-sync');
const TODODB = require('./models/index');
require('dotenv').config();

async function main() {

    const client = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_CLIENT_ID);

    mongoose.connect('mongodb://localhost:27017/DatabaseAI');

    const tools = {
        AddTODO: AddTODO,
        getAllTODO: getAllTODO
    }

    const SYSTEM_PROMPT = `
    Your name is Falio . You are an AI To-Do list manager. You can manage your to-do list by adding, deleting, and updating tasks. You must strictly follow the JSON output format.

    You are AI assistant with START , PLAN , ACTION , Obsevation  and Output State . Wait for  the user prompt and first PLAN using available tools . After Planning , take ACTION with apporriate tools and wait for the observation based on Action . Once ypu get observations , Returns the AI output based on START prompt and observations.

    Todo DB Schema : 
    title: {
        type: String
    }
    createdAt: {
        type: Date,
        default: Date.now   
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

    Available tools :
    AddTODO(title) : Add a new todo item and returns the added todo item.
    getAllTODO() : returns all the todo items.
    
    Example 1:
    START
    {"type":"user","user":"Add a task for shopping"}

    {"type":"plan","plan":"I will try to get more context on what the user wants to shop for"}

    {"type":"output","output":"What do you want to shop for?"}

    {"type":"user","user":"I want to shop for Grocries"}

    {"type":"plan","plan":"I will use AddTODO function to add a new todo in DB"}

    {"type":"action","function":"AddTODO","input":"Shopping and Buy Groceries"}

    {"type":"plan","plan":"I will wait for the observation from the AddTODO function"}

    {"type":"observation","observation":"Data has been Added:Shopping and Buy Groceries"}

    {"type":"output","output":"New item has been added in to do list"}


    Example 2:
    START
    {"type":"user","user":"Get all items in todo list"}

    {"type":"plan","plan":"I will use getAllTODO function to get all the todo items"}

    {"type":"action","function":"getAllTODO"}

    {"type":"plan","plan":"I will wait for the observation from the getAllTODO function"}

    {"type":"observation","observation":"[{"_id":"61f7b1b3b3b3b3b3b3b3b3b3","title":"Shopping and Buy Groceries","createdAt":"2022-01-31T06:00:00.000Z","updatedAt":"2022-01-31T06:00:00.000Z"}]"}

    {"type":"output","output":"Here are the items in your todo list: Shopping and Buy Groceries"}  

    `

    const model = client.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_PROMPT });


    function extractJsonObjects(input) {
        const cleaned = input.replace(/```json|```/g, '').trim();
        const jsonMatches = cleaned.match(/\{(?:[^{}]|{[^{}]*})*\}/g);
        if (!jsonMatches) return [];
        return jsonMatches.map(json => {
            try {
                return JSON.parse(json);
            } catch (error) {
                console.error("Error parsing JSON:", error, json);
                return null;
            }
        }).filter(obj => obj !== null);

    }

    const chat = model.startChat();

    while (true) {

        const query = readlinkSync.question("User: ");
        const answer = await chat.sendMessage(query);
        const FinalResponse = extractJsonObjects(answer.response.text());

        for (const answer of FinalResponse) {
            if (answer.type === "output") {
                console.log("Bot👻: " + answer.output);
                break;
            }

            if (answer.type === "action") {
                const tool = tools[answer.function];
                if (!tool) {
                    console.error("Tool not found: ", answer.function);
                    break;
                }
                const observation = await tool(answer.input);
                const response = {
                    type: "observation",
                    observation: observation
                }
                await chat.sendMessage(JSON.stringify(response));
            }
        }


    }

    function AddTODO(title) {

        const todo = new TODODB({
            title: title,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        todo.save().then((data) => {
            console.log("Data has been added : ", data);
        }).catch((err) => {
            console.log(err);
        });

        return todo;

    }

    function getAllTODO() {
        TODODB.find().then((data) => { console.log(data) }).catch((err) => { console.log(err) });
    }

}

main();