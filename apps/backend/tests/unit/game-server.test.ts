
import { describe, expect, it } from "vitest";
import { assignRolesToPlayers } from "../../src/game-server"
import { SocketId } from "@sounds-fishy/shared";

describe('assigning role', () => {

	it('2 players, everyone gets unique roles', () => {
	   const players = ['1', '2'] as SocketId[]
	   const roles = assignRolesToPlayers(players)
    	   expect(Object.entries(roles)).toHaveLength(2)
   		

	})

	it('3 players, everyone gets unique roles', () => {
	   const players = ['1', '2', '3'] as SocketId[]
	   const roles = assignRolesToPlayers(players)
    	   expect(Object.entries(roles)).toHaveLength(3)


	});

	it('3 players, 1 non masters, non master should not ever be master', () => {
	   const players = ['1', '2', '3'] as SocketId[]

           for (let i = 0; i < 30; i++) {
	   	const roles = assignRolesToPlayers(players, new Set(['1' as SocketId]))
    		expect(Object.entries(roles)).toHaveLength(3)
		expect(roles['1' as SocketId] !== "master").toBeTruthy()
	   }

	})

	it.only('3 players, 2 non masters, non master should not ever be master', () => {
	   const players = ['1', '2', '3'] as SocketId[]
	   const nonMasters = new Set(['1', '2'] as SocketId[])
	
           for (let i = 0; i < 30; i++) {
	   	const roles = assignRolesToPlayers(players, nonMasters)
    		expect(Object.entries(roles)).toHaveLength(3)
		expect(roles['1' as SocketId] !== "master").toBeTruthy()
		expect(roles['2' as SocketId] !== "master").toBeTruthy()
	   }

	})

	// TODO: 
	//
	// it('3 players, 3 non masters, should error', () => {
	//    const players = ['1', '2', '3'] as SocketId[]
	//    const nonMasters = new Set(['1', '2', '3'] as SocketId[])
	//
	// })

})

// describe('scoring', () => {
// 	//
// 	// it('test', () => {
// 	//
// 	//
// 	// });
//
// })
//
// describe('random problem', () => {
// 	// it('test', () => {
// 	//
// 	// })
// })
