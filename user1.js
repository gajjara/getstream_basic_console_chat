// Env
const dotenv = require("dotenv")
const env = dotenv.config().parsed;

// Console prompt
const prompt = require('prompt');

// Apollo + gql
const gql = require("graphql-tag");
const ApolloClient = require("apollo-client").ApolloClient;
const fetch = require("node-fetch");
const createHttpLink = require("apollo-link-http").createHttpLink;
const InMemoryCache = require("apollo-cache-inmemory").InMemoryCache;

// Stream chat
const StreamChat = require('stream-chat').StreamChat; 
const streamServerClient = StreamChat.getInstance(env.STREAM_KEY, process.env.STREAM_SECRET);

const link = createHttpLink({
    uri: env.API_SERVER,
    fetch: fetch
});
const client = new ApolloClient({
    link: link,
    cache: new InMemoryCache(),
});

/**
 * Query the database.
 * 
 * @param {gql} query the query
 * @returns {object} the data from the query
 */
const query_db = async (query) => {
    const job = await client.query({query: query,});
    console.log(job.data);
    return job.data;
} 

/**
 * Mutuate the database
 * 
 * @param {gql} mutation the mutation 
 * @param {object} variables variables passed into mutation
 * @returns {object} the data from the mutation
 */
const mutuate_db = async (mutation, variables) => {
    const job = await client.mutate({mutation: mutation, variables: variables});
    console.log(job.data);
    return job.data;
}

/**
 * Add a user to the database.
 * 
 * @param {String} email 
 * @returns {object} the user created
 */
const add_user = async (email) => {
    result = await mutuate_db(gql`mutation ExampleCreateUser($email: String!) {
        createUser(email: $email, type: ATHLETE) {
          email
          type
          id
          chat_id
          chat_token
        }
      }`,variables={email});
    return result;
}

/**
 * Send message thru a channel via the command line
 * 
 * @param {ChannelAPIResponse} channel 
 */
const send_messages = async (channel) => {
    prompt.message = "Enter";
    prompt.delimiter = " ";
    prompt.start();
    prompt.get(['message'], async function (err, result) {
        if (err) {
            return null;
        }
        if(result.message !== undefined && result.message !== null && channel !== undefined && channel !== null) {
            if(result.message === 'q') {
                await streamServerClient.disconnectUser();
                return;
            }
            else {
                await channel.sendMessage({text: result.message,});
            }
        }
        send_messages(channel);
    });
}

/**
 * Main routine.
 */
const main = async () => {
    // Add the new user and get chat id and chat token
    const user_added = await add_user(env.USER_EX);
    const id = user_added.createUser.chat_id;
    const chat_token = user_added.createUser.chat_token;

    // Connect the user
    await streamServerClient.connectUser({id: id,}, chat_token);

    // Get the users channel with user of name2
    const channel = streamServerClient.channel('messaging', { members: [id, 'name2'], }); 
    await channel.create();

    // Send messages via console
    send_messages(channel);

    // Listen for message 
    streamServerClient.on(event => { 
        if(event.message) {
            if(event.message.user.id !== id) {
                console.log("Recieved message: " + event.message.text + "\n");
            }
        }
    });
}

// Run
main();