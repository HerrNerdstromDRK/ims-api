// Import the React hooks
import React, { useState, useEffect } from "react";
import "./Home.css";

import { Amplify, API } from "aws-amplify";
import { useNavigate } from "react-router-dom";

// Import the AWS Amplify hooks and components
import {
  useTheme,
  useAuthenticator,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Flex,
  Grid,
  Heading,
  ScrollView,
  Image,
  Text,
  TextAreaField,
  TextField,
  View,
} from "@aws-amplify/ui-react";

// Import styles and app basics
import "@aws-amplify/ui-react/styles.css";
import "./w3-theme-dark-grey.css";
import awsExports from "./aws-exports";
Amplify.configure(awsExports);

// Used to generate unique IDs
const { v4: uuidv4 } = require("uuid");

// inventoryItemInitialFormState is used as the default values for inventory items
const inventoryItemInitialFormState = {
  name: "Inventory Name",
  description: "Inventory Description",
  quantity: 0,
};

// Name of the API to connect frontend to backend
const apiName = "imsapi";

// Access point for the inventory management system
const apiDirectory = "/items";

// Just for fun -- source of random images to attach to the inventory entries
const imageURL = "https://picsum.photos/200";

/**
 * Default function with primary logic for the app.
 */
export default function Home() {
  // These hooks must be in a particular order for React to function properly
  // inventoryItems holds the array of inventoryItems for display
  const [inventoryItems, setInventoryItems] = useState([]);

  // inventoryItemFormData records the name and description of inventory item being created or changed
  const [inventoryItemFormData, setInventoryItemFormData] = useState(
    inventoryItemInitialFormState
  );

  // viewInventoryItem refers to the inventoryItem currently in the view pane
  // It is empty by default, but when changed will trigger a state update and redraw.
  // Once set, a viewInventoryItem will always be set unless all inventoryItems are deleted.
  const [viewInventoryItem, setViewInventoryItem] = useState([]);

  // isUpdate is true when an inventoryItem is being updated, false otherwise.
  // Used to track status over time as the user is updating an inventoryItem.
  const [isUpdate, setIsUpdate] = useState(false);

  // The Id for the inventoryItem being updated. Corresponds to isUpdate -- is empty ('') when
  // no update is being made, and the Id when an update is being made.
  const [updateId, setUpdateId] = useState("");

  const { tokens } = useTheme();

  // The authenticator is used to login/logout a user and provide status
  const { user, signOut } = useAuthenticator((context) => [context.user]);

  // Route is used to navigate between pages
  const { route } = useAuthenticator((context) => [context.route]);
  const navigate = useNavigate();

  // useEffect() is called whenever the DOM is updated
  // Use it here to refresh our display
  useEffect(() => {
    fetchInventoryItems();
  }, []);

  // Set the document/page title
  useEffect(() => {
    document.title = "Simple Inventory Management System (useEffect)";
  }, []);

  // Return true if a user is logged in; false otherwise.
  const isAuthenticated = () => {
    return route === "authenticated";
  };

  // Potential bug in AWS Amplify -- the schema and amplify configuration is setup
  // to allow unauthenticated users to conduct read operations (listInventoryItems), however
  // it just doesn't seem to work for the initial startup in an unauthenticated state.
  // This work around fixes the problem. *shrug*
  if (isAuthenticated()) {
    Amplify.configure({
      aws_appsync_authenticationType: "AMAZON_COGNITO_USER_POOLS",
    });
  } else {
    Amplify.configure({
      aws_appsync_authenticationType: "API_KEY",
    });
  }

  /**
   * Retrieve all inventoryItems from the API and display to the user.
   */
  async function fetchInventoryItems() {
    //    console.log("fetchInventoryItems");

    const inventoryItemsFromAPI = await API.get(apiName, apiDirectory + "/id");

    setInventoryItems(
      inventoryItemsFromAPI.filter(
        (item) => item.name !== "" && item.description !== ""
      )
    );
    console.log(
      "fetchInventoryItems> JSON.stringify( apiData ):  " +
        JSON.stringify(inventoryItemsFromAPI)
    );
  }

  /**
   * Use data currently in the inventory item entry fields to create a new inventory item.
   * @returns N/A
   */
  async function createInventoryItem() {
    console.log(
      "createInventoryItem> name: " +
        inventoryItemFormData.name +
        ", description: " +
        inventoryItemFormData.description
    );

    // Ignore request if the inventoryFormData tracking variables are empty.
    if (!inventoryItemFormData.name || !inventoryItemFormData.description) {
      console.log("createInventoryItem> Blank name or description");
      return;
    }

    const restData = {
      id: uuidv4(),
      name: inventoryItemFormData.name,
      description: inventoryItemFormData.description,
      quantity: inventoryItemFormData.quantity,
      createdBy: user.getUsername(),
      createdAt: new Date().toISOString(),
    };
    console.log(
      "createInventoryItem> Going to post, restData: " +
        JSON.stringify(restData)
    );

    await API.post(apiName, apiDirectory, {
      body: restData,
    })
      .then((result) => {
        console.log("createInventoryItem> result: " + JSON.stringify(result));
      })
      .catch((err) => {
        console.log("createInventoryItem> error: " + err);
      });

    // Do a pull from the db to ensure the inventory items are synchronized.
    // Probably wouldn't do this in production, but useful for dev/test.
    fetchInventoryItems();

    // Reset the inventoryItemFormData tracking variable
    setInventoryItemFormData(inventoryItemInitialFormState);
    console.log(
      "createInventoryItem> Reset to initial form state; inventoryItemFormData: {" +
        JSON.stringify(inventoryItemFormData)
    );
  }

  function localLookupInventoryItem(searchID) {
    const searchInventoryItem = inventoryItems.filter(
      (inventoryItem) => inventoryItem.id === searchID
    );

    /*    console.log(
      "localLookupInventoryItem> Returning: " +
        JSON.stringify(searchInventoryItem)
    );
*/
    return searchInventoryItem;
  }

  /**
   * Update an inventory item in the database.
   */
  async function updateInventoryItem() {
    console.log(
      "updateInventoryItem> inventoryItemFormData: " +
        JSON.stringify(inventoryItemFormData)
    );

    let oldInventoryItem = localLookupInventoryItem(inventoryItemFormData.id);

    if (oldInventoryItem != null) {
      oldInventoryItem = oldInventoryItem[0];
    }
    console.log(
      "updateInventoryItem> Got response from localLookupInventoryItem: " +
        JSON.stringify(oldInventoryItem)
    );

    // Update the inventory item with the old id and new name, description, and quantity
    const restData = {
      id: oldInventoryItem.id,
      name: inventoryItemFormData.name,
      description: inventoryItemFormData.description,
      quantity: inventoryItemFormData.quantity,
      createdBy: oldInventoryItem.createdBy,
      createdAt: oldInventoryItem.createdAt,
    };
    console.log(
      "updateInventoryItem> Going to post, restData: " +
        JSON.stringify(restData)
    );

    await API.post(apiName, apiDirectory, { body: restData })
      .then((result) => {
        console.log("updateInventoryItem> result: " + JSON.stringify(result));
      })
      .catch((err) => {
        console.log("updateInventoryItem> error: " + err);
      });

    if (updateId === viewInventoryItem.id) {
      setViewInventoryItem(inventoryItemFormData);
    }

    // Reset the tracking variables

    // Clear Id of the inventoryItem being updated
    setUpdateId("");

    // Stop the update process
    setIsUpdate(false);

    // Reset the data area being used to track changes
    setInventoryItemFormData(inventoryItemInitialFormState);

    // Update all of the inventory items in the Card pane
    fetchInventoryItems();
  }

  /**
   * Delete the inventory item represented by the given id
   */
  async function deleteInventoryItem(inventoryItemToDelete) {
    //    console.log(
    //    "deleteInventoryItem> inventoryItemToDelete: " +
    //    JSON.stringify(inventoryItemToDelete)
    //);
    if (
      !isAuthenticated() ||
      user.getUsername() !== inventoryItemToDelete.createdBy
    ) {
      console.log(
        "deleteInventoryItem> User " +
          user.getUsername() +
          " attempted to delete inventory item it doesn't own: " +
          JSON.stringify(inventoryItemToDelete)
      );
      return;
    }
    /*
    const deleteParams = {
      id: inventoryItemToDelete.id,
    };
    await API.del(apiName, apiDirectory, { body: deleteParams })
      .then((result) => {
        console.log("deleteInventoryItem> result: " + JSON.stringify(result));
      })
      .catch((err) => {
        console.log("deleteInventoryItem> error: " + JSON.stringify(err));
      });
    */
    const params = {
      id: inventoryItemToDelete.id,
      name: "",
      description: "",
    };

    // Remove the inventory item from the database back
    await API.post(
      apiName,
      apiDirectory, //+ "/object/" + inventoryItemToDelete.id,
      { body: params }
    )
      .then((result) => {
        // console.log("deleteInventoryItem> result: " + JSON.stringify(result));
      })
      .catch((err) => {
        //  console.log("deleteInventoryItem> error: " + JSON.stringify(err));
      });

    // Refresh the local inventory items array and update the GUI
    fetchInventoryItems();

    // If the inventory item just erased was also being viewed, then reset
    // the local tracker of the viewed inventory item
    if (viewInventoryItem.id === updateId) setViewInventoryItem([]);
  }

  /**
   * This method notifies the DOM/vDOM that the user has requested a change, specifically
   * to update an inventory item.
   * This should trigger a re-render of the inventoryContextTextAreaField and change the button name
   * and desecription.
   */
  async function initiateInventoryItemUpdate(inventoryItem) {
    console.log(
      "initiaveInventoryItemUpdate> inventoryItem.id: " +
        inventoryItem.id +
        ", inventoryItem.name: " +
        inventoryItem.name +
        ", inventoryItem.description: " +
        inventoryItem.description
    );
    setIsUpdate(true);
    setInventoryItemFormData(inventoryItem);
    setUpdateId(inventoryItem.id);
  }

  /**
   * Return the description control for an inventory item. Record updates to the description
   * field in the inventoryItemFormData variable.
   */
  function inventoryItemDescriptionTextAreaField(inventoryItemDescription) {
    //    console.log(
    //      "inventoryItemDescriptionTextAreaField> inventoryItemDescription: " + inventoryItemDescription
    //    );
    // Had to split this into two because I couldn't figure out a good way to include
    // an onChange() handler as a conditional
    if (!isAuthenticated()) {
      return (
        <TextAreaField
          autoComplete="off"
          direction="row"
          hasError={false}
          isDisabled={true}
          isReadOnly={true}
          isRequired={false}
          label="Inventory Item Description"
          labelHidden={true}
          name="inventoryItemDescription"
          value={inventoryItemFormData.description}
          placeholder="Login to create or update an inventory item"
          rows="8"
          wrap="wrap"
          resize="vertical"
        />
      );
    } else {
      return (
        <TextAreaField
          autoComplete="off"
          direction="row"
          hasError={false}
          isDisabled={false}
          isRequired={false}
          label="Inventory Item Description"
          labelHidden={true}
          name="inventoryItemDescription"
          placeholder="Inventory Item Description Goes Here :)"
          rows="8"
          defaultValue="Inventory Item Description Goes Here :)"
          wrap="wrap"
          value={inventoryItemFormData.description}
          resize="vertical"
          onChange={(e) =>
            setInventoryItemFormData({
              ...inventoryItemFormData,
              description: e.currentTarget.value,
            })
          }
        />
      );
    }
  }

  /**
   * Logic to build the deleteInventoryItemButton based on authentication state.
   */
  function deleteInventoryItemButton(inventoryItem) {
    /*    console.log(
      "deleteInventoryItemButton> isAuthenticated: " +
        isAuthenticated() +
        ", username: " +
        user.getUsername() +
        ", inventoryItem.createdBy: " +
        inventoryItem.createdBy
    );*/

    if (isAuthenticated() && user.getUsername() === inventoryItem.createdBy) {
      //      console.log(
      //      "deleteInventoryItemButton> Authenticated with correct owner"
      //  );
      return (
        <Button size="small" onClick={() => deleteInventoryItem(inventoryItem)}>
          Delete Inventory Item
        </Button>
      );
    } else {
      //      console.log("deleteInventoryItemButton> Not logged in or wrong owner");
      return "";
    }
  }

  /**
   * Logic to build the updateInventoryItemButton based on authentication state.
   */
  function updateInventoryItemButton(inventoryItem) {
    if (isAuthenticated() && user.username === inventoryItem.createdBy) {
      return (
        <Button
          size="small"
          isDisabled={isUpdate}
          onClick={() => initiateInventoryItemUpdate(inventoryItem)}
        >
          Update Inventory Item
        </Button>
      );
    } else {
      return "";
    }
  }

  /**
   * Build and return a Card wrapping a single inventoryItem.
   * @param {*} inventoryItem: The individual inventory item to wrap in the Card.
   * @returns
   */
  function inventoryItemCard(inventoryItem) {
    /*    console.log(
      "inventoryItemCard> inventoryItem.name: " +
        inventoryItem.name +
        ", inventoryItem.description: " +
        inventoryItem.description +
        ", createdAt: " +
        inventoryItem.createdAt
    );
  */
    return (
      <View padding={tokens.space.xs}>
        <Card>
          <Flex direction="row" alignItems="flex-start">
            <Image
              alt="Pseudo-Random Image"
              src={imageURL + "?random=" + inventoryItem.id}
              width="20%"
            />
            <Flex
              direction="column"
              alignItems="flex-start"
              gap={tokens.space.xs}
            >
              <Flex>
                <Badge size="small" variation="info">
                  Created: {inventoryItem.createdAt}
                </Badge>
                <Badge size="small" variation="info">
                  Owner: {inventoryItem.createdBy}
                </Badge>
              </Flex>
              <Heading variation="quiet" maxLength={100} level={6}>
                Name: {inventoryItem.name}
              </Heading>
              <Heading variation="quiet" maxLength={100} level={6}>
                Quantity: {inventoryItem.quantity}
              </Heading>
              <TextAreaField
                variation="quiet"
                maxLength={100}
                rows={2}
                wrap="wrap"
                width="500px"
                isReadOnly={true}
                as="span"
              >
                {inventoryItem.description.length > 100
                  ? inventoryItem.description.substring(0, 99) + "..."
                  : inventoryItem.description}
              </TextAreaField>
              <ButtonGroup justification="center" variation="primary">
                {deleteInventoryItemButton(inventoryItem)}
                {updateInventoryItemButton(inventoryItem)}

                <Button
                  size="small"
                  onClick={() => setViewInventoryItem(inventoryItem)}
                >
                  View Inventory Item
                </Button>
              </ButtonGroup>
            </Flex>
          </Flex>
        </Card>
      </View>
    );
  }

  /**
   * Returns the login or logout button for the inventory item header, depending on current
   * authentication state.
   */
  const getLoginOrLogoutButton = () => {
    if (isAuthenticated()) {
      return (
        <Button size="small" onClick={signOut}>
          Sign Out
        </Button>
      );
    } else {
      return (
        <Button size="small" onClick={() => navigate("/Login")}>
          Sign In
        </Button>
      );
    }
  };

  /**
   * Return the header to be used for each inventory item page.
   */
  const getInventoryHeader = () => {
    return (
      <>
        <center>
          <Heading level={1}>Simple CRUD Inventory Management System</Heading>
          <Text>
            {isAuthenticated() ? (
              <Text>Welcome {user.username}!</Text>
            ) : (
              "Please login to create or update inventory items"
            )}
          </Text>
          {getLoginOrLogoutButton()}
        </center>
      </>
    );
  };

  /**
   * This method is called to choose whether the inventory item text field area is
   * to be used to create a new inventory item  or modify an existing inventory item.
   * In the former case, populate the fields with default name and description and
   * set the button as createInventoryItem.
   * In the latter case, populate the fields with name and description from the
   * referenced inventoryItem and set the button to update the inventory item.
   * @returns
   */
  const renderCreateOrUpdateInventoryItemView = () => {
    //   console.log("renderCreateOrUpdateInventoryItemView> isUpdate: " + isUpdate);
    /*
    console.log(
      "renderCreateOrUpdateInventoryItemView> updateId: " +
        updateId +
        ", inventoryItemFormData.name: " +
        inventoryItemFormData.name +
        ", inventoryItemFormData.description: " +
        inventoryItemFormData.description
    );
    */
    if (!isAuthenticated()) {
      return (
        <div>
          <TextField
            alignItems="baseline"
            direction="row"
            isReadOnly={true}
            label="Inventory Item Name"
            labelHidden={false}
            isDisabled={true}
            name="inventoryItemName"
            value={inventoryItemFormData.name}
            placeholder="Login to create or update inventory item"
            rows="8"
          />
          <TextField
            alignItems="baseline"
            direction="row"
            isReadOnly={true}
            label="Inventory Quantity"
            labelHidden={false}
            isDisabled={true}
            name="inventoryItemQuantity"
            value={inventoryItemFormData.quantity}
            placeholder="Login to create or update inventory item"
            rows="8"
          />
          <p>
            {inventoryItemDescriptionTextAreaField(
              inventoryItemFormData.description
            )}
          </p>
        </div>
      );
    } else {
      return (
        <div>
          <TextField
            alignItems="baseline"
            direction="row"
            isReadOnly={false}
            label="Inventory Item Name"
            labelHidden={false}
            isDisabled={false}
            name="inventoryItemName"
            value={inventoryItemFormData.name}
            placeholder="Login to create or update inventory item"
            rows="8"
            onChange={(e) => {
              setInventoryItemFormData({
                ...inventoryItemFormData,
                name: e.target.value,
              });
            }}
          />
          <TextField
            alignItems="baseline"
            direction="row"
            isReadOnly={false}
            label="Inventory Item Quantity"
            labelHidden={false}
            isDisabled={false}
            name="inventoryItemQuantity"
            value={inventoryItemFormData.quantity}
            placeholder="Login to create or update inventory item"
            rows="8"
            type="number"
            step="1"
            min="0"
            onChange={(e) => {
              setInventoryItemFormData({
                ...inventoryItemFormData,
                quantity: e.target.value,
              });
            }}
          />
          <p>
            {inventoryItemDescriptionTextAreaField(
              inventoryItemFormData.description
            )}
          </p>
          <Button
            variation="primary"
            size="small"
            onClick={isUpdate ? updateInventoryItem : createInventoryItem}
          >
            {isUpdate ? "Update Inventory Item" : "Create Inventory Item"}
          </Button>
        </div>
      );
    }
  };

  // Default return for the Home function() is to build a grid
  // for the page with the header, inventory list on the right, and
  // inventory view and create/update inventory item controls on the left
  return (
    <Grid
      className="amplify-grid"
      templateColumns={{ base: "1fr", large: "1fr 1fr" }}
      templateRows={{ base: "repeat(4, 10rem)", large: "repeat(3, 10rem)" }}
      gap="var(--amplify-space-small)"
    >
      <View key="inventoryHeaderView" padding={tokens.space.medium}>
        {getInventoryHeader()}
      </View>
      <View key="inventoryItemListView" padding={tokens.space.medium}>
        {inventoryItems.map((inventoryItem) =>
          inventoryItemCard(inventoryItem)
        )}
      </View>
      <Flex className="container-flex-content-and-create">
        <ScrollView
          className="container-flex-content-and-create-child"
          key="viewInventoryScrollView"
          orientation="vertical"
          padding={tokens.space.medium}
        >
          <Text>
            <b>Name:</b> {viewInventoryItem.name}
          </Text>
          <Text>
            <b>Decription:</b> {viewInventoryItem.description}
          </Text>
          <Text>
            <b>Quantity: </b>
            {viewInventoryItem.quantity}
          </Text>
        </ScrollView>
        <View
          className="container-flex-content-and-create-child"
          key="createOrUpdateInventoryItemView"
          padding={tokens.space.medium}
        >
          {renderCreateOrUpdateInventoryItemView()}
        </View>
      </Flex>
    </Grid>
  );
}
