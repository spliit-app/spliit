import { keychain ,KeychainComponents } from "@libp2p/keychain"
import { KeyChain } from "@libp2p/interface-keychain"
import { defaultLogger } from '@libp2p/logger'
import { CMS } from '@libp2p/cms'
import { IDBDatastore } from 'datastore-idb'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import { getGroup } from '@/lib/api'
import { getGroupExpenses, getExpense } from '@/lib/api'

const DB_NAME = "spliit"

export default class Cryptography {
  components!: KeychainComponents

  async initialize() {
    const dataStore = new IDBDatastore(DB_NAME)
    await dataStore.open()

    const components = {
      datastore: dataStore,
      logger: defaultLogger()
    }
    this.components = components
  }

  getKeychain(passcode: string) : KeyChain {
    return keychain({pass:passcode})(this.components) as KeyChain
  }

  async importKey(groupId: string, privateKey: string, passcode: string) {
    await this.getKeychain(passcode)
      .importKey(groupId, atob(privateKey), passcode)
      .catch(async err => {
        console.warn("unable to import key", err)
      })
  }

  async exportKey(groupId: string, passcode: string) : Promise<string> {
    const kc = this.getKeychain(passcode)

    const key = await kc
    .findKeyByName(groupId)
    .catch(async err => {
      console.warn("no key found, create one")
    })

    if (!key) {
      await kc.createKey(groupId, "RSA", 2048).catch(err => {
        console.error("createKey error", err)
        throw err
      })
    }

    const pkey = await kc.exportKey(groupId, passcode);
    return btoa(pkey)
  }

  async encryptValue(groupId: string, passcode: string, value: string) : Promise<string> {
    const cms = new CMS(this.getKeychain(passcode))

    const encryptedMessage = await cms
      .encrypt(groupId, uint8ArrayFromString(value, "ascii"))
      .catch(err => {
        console.error("encrypt error", err)
        throw err
      })

    return btoa(JSON.stringify(Array.from(encryptedMessage)))
  }

  async decryptValue(passcode: string, value: string) : Promise<string> {
    const cms = new CMS(this.getKeychain(passcode))
    const encryptedArray = new Uint8Array(JSON.parse(atob(value)) as ArrayBufferLike)

    const decryptedMessage = await cms
      .decrypt(encryptedArray)
      .catch(err => {
        console.error("decrypt error", err)
        throw err
      })

    return uint8ArrayToString(decryptedMessage, "ascii")
  }
}

export async function getCryptography() {
  const cryptography = new Cryptography()
  await cryptography.initialize()
  return cryptography
}

export async function importKeyForGroup(groupId: string, privateKey: string, passcode: string){
  const crypto = await getCryptography()
  await crypto.importKey(groupId, privateKey, passcode)
}

export async function exportKeyForGroup(groupId: string, passcode: string) : Promise<string> {
  const crypto = await getCryptography()
  return await crypto.exportKey(groupId, passcode)
}

export async function encryptGroup(group: NonNullable<Awaited<ReturnType<typeof getGroup>>>, passcode: string, values: GroupFormValues) : Promise<GroupFormValues> {
  const crypto = await getCryptography()
  return {
    name: await crypto.encryptValue(group.id, passcode, values.name),
    currency: group.currency,
    participants: group.participants
  }
}

export async function decryptGroup(group: NonNullable<Awaited<ReturnType<typeof getGroup>>>, passcode: string) : Promise<NonNullable<Awaited<ReturnType<typeof getGroup>>>> {
  const crypto = await getCryptography()
  return {
    ...group,
    name: await crypto.decryptValue(passcode, group.name)
  }
}

export async function encryptExpense(groupId: string, passcode: string, expense: ExpenseFormValues) : Promise<ExpenseFormValues> {
  const crypto = await getCryptography()
  const e =  {
    ...expense,
    title: await crypto.encryptValue(groupId, passcode, expense.title)    
  }
  console.log(e)
  return e
}

export async function decryptExpenses(groupId: string, passcode: string, expenses: Awaited<ReturnType<typeof getGroupExpenses>>): Promise<Awaited<ReturnType<typeof getGroupExpenses>>> {
  const crypto = await getCryptography()
  const retVal: Awaited<ReturnType<typeof getGroupExpenses>> = []
  for (const expense of expenses) {
    retVal.push(
      {
        ...expense,        
        title: await crypto.decryptValue(passcode, expense.title)        
      }
    )
  }
  return retVal
}

export async function decryptExpense(groupId: string, passcode: string, expense: Awaited<ReturnType<typeof getExpense>>): Promise<Awaited<ReturnType<typeof getExpense>>> {
  const crypto = await getCryptography()
  const retVal: Awaited<ReturnType<typeof getGroupExpenses>> = []  
  return {
    ...expense!,
    title: await crypto.decryptValue(passcode, expense!.title)
  }
}