import { FakeInMemoryDataLoader, InMemoryDataLoader } from "../dataLoader";
import { simpleDefinition } from "../example/simple";

describe("In memory data loader", () => {
  describe("Performs CRUD operations", async () => {
    const loader = new InMemoryDataLoader(simpleDefinition);
    const resource = { title: "Hello world" };

    let uid: string;
    it("Creates a resource and returns its UID", async () => {
      uid = (await loader.create("Document", resource)).uid;
      expect(uid).toBeTruthy();
    });

    it("Reads a resource back using its UID and type", async () => {
      const read = await loader.read(uid, "Document");
      expect(read).toEqual(resource);
    });

    it("Updates resources", async () => {
      const success = await loader.update(uid, "Document", {
        text: "Lorem Ipsum"
      });
      expect(success).toBeTruthy();

      let result = await loader.read(uid, "Document");
      expect(result).toEqual({ title: "Hello world", text: "Lorem Ipsum" });

      const success2 = await loader.update(uid, "Document", { title: "Dolor" });
      expect(success2).toBeTruthy();

      result = await loader.read(uid, "Document");
      expect(result).toEqual({ title: "Dolor", text: "Lorem Ipsum" });
    });

    it("Lists resources", async () => {
      let list = await loader.list("Document");
      expect(list.length).toBe(1);

      const resource2 = { title: "Hello world!" };
      await loader.create("Document", resource2);
      list = await loader.list("Document");
      expect(list.length).toBe(2);
    });
  });
});

describe("Fake data loader", () => {
  it("Generates fake data for the example file", async () => {
    expect(async () => {
      const loader = new FakeInMemoryDataLoader(simpleDefinition, 10);
      const allDocumentKeys = await loader.list("Document");
    }).not.toThrow();
  });
});
