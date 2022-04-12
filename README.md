# fund-forwarding-frontend
A frontend for the fund forwarding contract

## Configuration

Configuration settings are configured with environment variables.
Environment variables can be set in `.env`

| Variable | Type | Description | Example |
| :-------: | :---: | :--------- | :------ |
| `CONTRACT_ADDRESS` | `string` | The address of the fund forwarding contract | `secret1w8qyw5t2lc2s0v8yqgnpqpsg3eqnjrcsgarz6m` |
| `GRPCWEB_URL` | `string` | URL of a gRPC-Web endpoint | `http://rpc.pulsar.griptapejs.com:9091` | 
| `CHAIN_ID` | `string` | The chain-id of the network | `pulsar-2` | 

## Usage

Install dependencies
`npm i`

Start Local Dev Server on port 8081
`npm run dev`

Build for production.
`npm run build`
Pruduction files will output the `dist` folder and can be uploaded to any web host.