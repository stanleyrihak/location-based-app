import {View, Text, StyleSheet} from "react-native";
import SettingsTileSection from "@components/settings-tile-section";

const Settings = () => {
    return <View style={styles.container}>
        <View>
            <Text style={styles.subheading}>Your account</Text>
            <Text style={styles.heading}>Profile</Text>
        </View>
        <View style={styles.tileSectionsWrapper}>
            <SettingsTileSection title="Preferences"
                                 tiles={[{name: "Notifications"}, {name: "Location"}, {name: "Payment methods"}]}/>
            <SettingsTileSection title="More"
                                 tiles={[{name: "Language"}, {name: "Help & Support"}, {name: "Privacy"}]}/>

        </View>
    </View>
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBF9',
        paddingHorizontal: 12,
        paddingVertical: 58,
    },
    subheading: {
        fontSize: 12,
        textTransform: 'uppercase',
        color: 'green',
    },
    heading: {
        fontSize: 30,
        color: 'darkgrey'
    },
    tileSectionsWrapper: {
        display: 'flex',
        gap: 20,
    }
})

export default Settings;